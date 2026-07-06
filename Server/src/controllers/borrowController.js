import { asyncHandler } from "../utils/asyncHandler.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { BorrowTransaction } from "../models/BorrowTransaction.js";
import { Tool } from "../models/Tool.js";
import { Community } from "../models/Community.js";
import { User } from "../models/User.js";
import { adjustTrustPoints, getPriorityScore, getTrustTier } from "../services/trustService.js";
import { audit } from "../services/auditService.js";
import { Dispute } from "../models/Dispute.js";
import { MessageThread } from "../models/MessageThread.js";
import { notifyUser } from "../services/notificationService.js";
import mongoose from "mongoose";

const MINIMUM_BORROW_TRUST = 51;

export const listBorrowRequests = asyncHandler(async (req, res) => {
  const query = { community: req.user.community };
  
  // Filter by role: if user is resident, only show their requests
  if (req.user.role === "resident") {
    query.$or = [{ borrower: req.user._id }, { owner: req.user._id }];
  }
  
  // Optional status filter
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Optional filter param for frontend
  if (req.query.filter === "borrowed") {
    query.borrower = req.user._id;
    delete query.$or;
  } else if (req.query.filter === "lent") {
    query.owner = req.user._id;
    delete query.$or;
  }

  const requests = await BorrowRequest.find(query)
    .populate("tool", "name images status healthScore depositPoints")
    .populate("borrower", "fullName trustPoints email")
    .populate("owner", "fullName trustPoints email")
    .sort({ priorityScore: -1, createdAt: -1 });
  res.json({ requests });
});

export const createBorrowRequest = asyncHandler(async (req, res) => {
  const tool = await Tool.findById(req.body.tool);
  if (!tool || tool.community.toString() !== req.user.community.toString()) {
    return res.status(404).json({ message: "Tool not found in your community" });
  }
  if (tool.owner.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot borrow your own tool" });
  }
  if (!["available", "reserved"].includes(tool.status)) {
    return res.status(400).json({ message: "Tool is not available for reservation" });
  }

  const borrower = await User.findById(req.user._id);
  if (borrower.trustPoints < MINIMUM_BORROW_TRUST) {
    return res.status(403).json({ message: "You need more than 50 trust points to borrow. Return active items or rebuild trust first." });
  }
  // Enforce configurable concurrent borrow limit from community settings
  const community = await Community.findById(tool.community);
  const maxConcurrent = (community && community.trustRules && community.trustRules.maxConcurrentBorrows) || 1;
  // Count only actively borrowed items (transactions) to prevent blocking users who only have pending requests
  const activeCount = await BorrowTransaction.countDocuments({ borrower: req.user._id, status: "active" });
  if (activeCount >= maxConcurrent) {
    return res.status(400).json({ message: `You have reached the concurrent borrow limit (${maxConcurrent}). Return active items or wait until they are completed.` });
  }

  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  const requestedDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  if (requestedDays > tool.maxBorrowDays) {
    return res.status(400).json({ message: `This item can only be borrowed for up to ${tool.maxBorrowDays} day(s).` });
  }

  // Validate against tool's blocked dates
  if (tool.blockedDates && tool.blockedDates.length > 0) {
    const hasBlockedOverlap = tool.blockedDates.some(blocked => {
      const blockedDate = new Date(blocked);
      return blockedDate >= startDate && blockedDate <= endDate;
    });
    if (hasBlockedOverlap) {
      return res.status(400).json({ message: "The requested dates overlap with blocked dates for this tool." });
    }
  }

  // Check for overlapping approved/active borrow requests (prevent double-booking)
  const overlapping = await BorrowRequest.findOne({
    tool: tool._id,
    status: { $in: ["approved", "picked_up", "admin_review", "verified"] },
    _id: { $ne: req.params.id },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });
  if (overlapping) {
    return res.status(400).json({ message: "This tool is already reserved for the requested dates. Please choose different dates." });
  }

  const borrowRequest = await BorrowRequest.create({
    tool: tool._id,
    borrower: req.user._id,
    owner: tool.owner,
    community: req.user.community,
    startDate,
    endDate,
    requestNote: req.body.requestNote,
    escrowPoints: tool.depositPoints,
    initialEvidenceUrl: req.body.evidenceUrl || null,
    evidenceUrls: req.body.evidenceUrl ? [req.body.evidenceUrl] : [],
    initialEvidenceMedia: req.body.evidenceMedia || (req.body.evidenceUrl ? { url: req.body.evidenceUrl, resourceType: "image" } : undefined),
    evidenceMedia: req.body.evidenceMedia ? [req.body.evidenceMedia] : (req.body.evidenceUrl ? [{ url: req.body.evidenceUrl, resourceType: "image" }] : []),
    // Tier-based auto-approval: Platinum users skip admin review for low deposit tools
    status: (getTrustTier(borrower.trustPoints) === "Platinum" && tool.depositPoints <= 10) ? "verified" : "admin_review",
    priorityScore: getPriorityScore(borrower, requestedDays)
  });

  await audit(req.user, "borrow.request", "BorrowRequest", borrowRequest._id, { tool: tool.name });
  await MessageThread.create({
    borrowRequest: borrowRequest._id,
    tool: tool._id,
    community: req.user.community,
    participants: [req.user._id, tool.owner],
    lastMessageAt: new Date(),
    messages: [{
      sender: req.user._id,
      body: req.body.requestNote || `Requesting to borrow ${tool.name}.`,
      readBy: [req.user._id]
    }]
  });
  await notifyUser(req.user._id, { title: "Borrow request submitted", message: `${tool.name} is awaiting admin ID and security verification.`, type: "borrow", data: { borrowRequestId: borrowRequest._id } });
  res.status(201).json({ borrowRequest });
});

export const reviewBorrowVerification = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool").populate("borrower", "fullName");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const decision = req.body.decision;
  borrowRequest.adminVerification = {
    status: decision === "verified" ? "verified" : "rejected",
    note: req.body.note || req.body.adminNote || "",
    reviewedBy: req.user._id,
    reviewedAt: new Date()
  };

  if (decision === "verified") {
    borrowRequest.status = "verified";
    await notifyUser(borrowRequest.owner, {
      title: "Borrow request verified",
      message: `${borrowRequest.borrower?.fullName || "A borrower"} was verified for ${borrowRequest.tool.name}. You can now approve or reject the request.`,
      type: "borrow",
      data: { borrowRequestId: borrowRequest._id }
    });
    await notifyUser(borrowRequest.borrower._id || borrowRequest.borrower, {
      title: "Borrow verification passed",
      message: `Your request for ${borrowRequest.tool.name} is now waiting for lender approval.`,
      type: "borrow",
      data: { borrowRequestId: borrowRequest._id }
    });
  } else {
    borrowRequest.status = "rejected";
    await notifyUser(borrowRequest.borrower._id || borrowRequest.borrower, {
      title: "Borrow request rejected",
      message: `Your request for ${borrowRequest.tool.name} did not pass admin verification.`,
      type: "borrow",
      data: { borrowRequestId: borrowRequest._id }
    });
  }

  await borrowRequest.save();
  await audit(req.user, "borrow.verification", "BorrowRequest", borrowRequest._id, { status: borrowRequest.adminVerification.status });
  res.json({ borrowRequest });
});

export const decideBorrowRequest = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const isOwner = borrowRequest.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can decide this request" });
  const { decision } = req.body;
  if (decision === "approved" && borrowRequest.status !== "verified" && !isAdmin) {
    return res.status(400).json({ message: "Admin verification is required before lender approval" });
  }
  if (decision === "approved" && isAdmin && borrowRequest.status === "admin_review") {
    borrowRequest.adminVerification = { status: "verified", reviewedBy: req.user._id, reviewedAt: new Date(), note: "Verified during admin approval" };
  }

  if (decision === "approved") {
    // Use MongoDB transaction for atomic escrow lock + status update
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await adjustTrustPoints({
        userId: borrowRequest.borrower,
        community: borrowRequest.community,
        amount: -borrowRequest.escrowPoints,
        type: "escrow_lock",
        reason: "Borrowing escrow locked",
        relatedTool: borrowRequest.tool._id,
        relatedBorrowRequest: borrowRequest._id,
        session
      });
      borrowRequest.status = "approved";
      borrowRequest.approvedAt = new Date();
      borrowRequest.tool.status = "reserved";
      await borrowRequest.tool.save({ session });
      await borrowRequest.save({ session });
      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    borrowRequest.status = "rejected";
    await borrowRequest.save();
  }
  // notify borrower of decision
  await notifyUser(borrowRequest.borrower, { title: "Borrow request update", message: `Your request for ${borrowRequest.tool.name} was ${borrowRequest.status}.`, type: "borrow", data: { borrowRequestId: borrowRequest._id } });
  res.json({ borrowRequest });
});

export const complainBorrowRequest = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const isOwner = borrowRequest.owner.toString() === req.user._id.toString();
  if (!isOwner) return res.status(403).json({ message: "Only the listed owner can file a complaint for this borrowing." });
  if (!["picked_up", "overdue", "completed"].includes(borrowRequest.status)) {
    return res.status(400).json({ message: "Complaints can be filed after pickup or return." });
  }

  const dispute = await Dispute.create({
    borrowRequest: borrowRequest._id,
    tool: borrowRequest.tool._id,
    reportedBy: req.user._id,
    againstUser: borrowRequest.borrower,
    community: borrowRequest.community,
    type: req.body.type || "other",
    description: req.body.description,
    evidenceUrls: req.body.evidenceUrls || []
  });
  borrowRequest.status = "disputed";
  await borrowRequest.save();
  await audit(req.user, "borrow.complaint", "Dispute", dispute._id, { tool: borrowRequest.tool.name });
  res.status(201).json({ dispute });
});

export const pickupBorrowRequest = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  if (borrowRequest.borrower.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Only borrower can confirm pickup" });
  borrowRequest.status = "picked_up";
  borrowRequest.pickupChecklist = req.body.pickupChecklist;
  borrowRequest.tool.status = "borrowed";
  borrowRequest.tool.borrowCount += 1;
  await borrowRequest.tool.save();
  await borrowRequest.save();
  await BorrowTransaction.create({
    borrowRequest: borrowRequest._id,
    tool: borrowRequest.tool._id,
    borrower: borrowRequest.borrower,
    owner: borrowRequest.owner,
    community: borrowRequest.community,
    startedAt: new Date()
  });
  res.json({ borrowRequest });
});

export const returnBorrowRequest = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  if (borrowRequest.borrower.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Only borrower can return this tool" });
  // Borrower submits return evidence; ownership verification is required
  borrowRequest.status = "returned";
  borrowRequest.returnedAt = new Date();
  borrowRequest.returnChecklist = req.body.returnChecklist || {};
  // store photo evidence url if provided
  if (req.body.returnChecklist && req.body.returnChecklist.photoEvidenceUrl) {
    borrowRequest.returnChecklist.photoEvidenceUrl = req.body.returnChecklist.photoEvidenceUrl;
  }
  await borrowRequest.save();

  // Create/Update BorrowTransaction to mark returned pending owner verification
  await BorrowTransaction.findOneAndUpdate(
    { borrowRequest: borrowRequest._id },
    { returnedAt: borrowRequest.returnedAt, status: "active" },
    { upsert: true, new: true }
  );

  // notify owner that return was submitted
  await notifyUser(borrowRequest.owner, { title: "Return submitted", message: `${req.user.fullName || "A borrower"} submitted return evidence for ${borrowRequest.tool.name}.`, type: "borrow", data: { borrowRequestId: borrowRequest._id } });

  res.json({ borrowRequest, message: "Return submitted and awaiting owner verification." });
});

export const verifyReturn = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const isOwner = borrowRequest.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can verify return" });

  // Fetch community trust rules for configurable point values
  const community = await Community.findById(borrowRequest.community);
  const trustRules = community && community.trustRules ? community.trustRules : {};
  const latePenaltyPerDay = trustRules.latePenaltyPerDay || 5;
  const successfulBorrowReward = trustRules.successfulBorrowReward || 5;
  const lendingReward = trustRules.lendingReward || 3;

  const returnedAt = borrowRequest.returnedAt || new Date();
  const lateDays = returnedAt > borrowRequest.endDate ? Math.ceil((returnedAt - borrowRequest.endDate) / (1000 * 60 * 60 * 24)) : 0;
  // FIX: Late returns are still 'completed' — 'disputed' is only for actual disputes
  borrowRequest.status = "completed";
  borrowRequest.tool.status = "available";
  borrowRequest.tool.healthScore = Math.max(0, borrowRequest.tool.healthScore - (lateDays ? 4 : 1));
  await borrowRequest.tool.save();
  await borrowRequest.save();

  await BorrowTransaction.findOneAndUpdate(
    { borrowRequest: borrowRequest._id },
    // FIX: Late returns should be 'completed' not 'disputed'
    { returnedAt, lateDays, status: "completed" },
    { new: true }
  );

  // Release escrow
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: borrowRequest.escrowPoints,
      type: "escrow_release",
      reason: "Borrowing escrow released",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id,
      session
    });
    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }

  if (lateDays) {
    // FIX: Use community-configured latePenaltyPerDay instead of hardcoded 5
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: -(latePenaltyPerDay * lateDays),
      type: "penalty",
      reason: `Late return penalty: ${lateDays} day(s) at ${latePenaltyPerDay} pts/day`,
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
  } else {
    // FIX: Use community-configured successfulBorrowReward instead of hardcoded 3
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: successfulBorrowReward,
      type: "reward",
      reason: "Successful on-time return",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
    // FIX: Use community-configured lendingReward instead of hardcoded 8
    await adjustTrustPoints({
      userId: borrowRequest.owner,
      community: borrowRequest.community,
      amount: lendingReward,
      type: "reward",
      reason: "Lending reward",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
  }

  // notify borrower that return was verified and escrow released
  await notifyUser(borrowRequest.borrower, { title: "Return verified", message: `Your return for ${borrowRequest.tool.name} was verified. Escrow released.`, type: "borrow", data: { borrowRequestId: borrowRequest._id } });

  res.json({ borrowRequest });
});
