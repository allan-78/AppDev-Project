import { asyncHandler } from "../utils/asyncHandler.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { BorrowTransaction } from "../models/BorrowTransaction.js";
import { Tool } from "../models/Tool.js";
import { Community } from "../models/Community.js";
import { User } from "../models/User.js";
import { adjustTrustPoints, getPriorityScore } from "../services/trustService.js";
import { audit } from "../services/auditService.js";
import { Dispute } from "../models/Dispute.js";
import { MessageThread } from "../models/MessageThread.js";
import { Notification } from "../models/Notification.js";

const MINIMUM_BORROW_TRUST = 51;

export const listBorrowRequests = asyncHandler(async (req, res) => {
  const query = { community: req.user.community };
  if (req.user.role === "resident") query.$or = [{ borrower: req.user._id }, { owner: req.user._id }];
  if (req.query.status) query.status = req.query.status;

  const requests = await BorrowRequest.find(query)
    .populate("tool", "name images status healthScore")
    .populate("borrower", "fullName trustPoints")
    .populate("owner", "fullName")
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
  // Require ID on file before borrowing
  if (!borrower.idImageUrl) {
    return res.status(403).json({ message: "Please upload a valid ID in your profile before requesting to borrow items." });
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
  // notify owner of incoming request
  try {
    const note = await Notification.create({ user: tool.owner, title: "New borrow request", message: `${req.user.fullName || 'A user'} requested to borrow ${tool.name}` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(tool.owner), { id: note._id, title: note.title, message: note.message }); } catch (e) {}
  } catch (e) { }
  res.status(201).json({ borrowRequest });
});

export const decideBorrowRequest = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const isOwner = borrowRequest.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can decide this request" });

  const { decision } = req.body;
  if (decision === "approved") {
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: -borrowRequest.escrowPoints,
      type: "escrow_lock",
      reason: "Borrowing escrow locked",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
    borrowRequest.status = "approved";
    borrowRequest.approvedAt = new Date();
    borrowRequest.tool.status = "reserved";
    await borrowRequest.tool.save();
  } else {
    borrowRequest.status = "rejected";
  }
  await borrowRequest.save();
  // notify borrower of decision
  try {
    const note = await Notification.create({ user: borrowRequest.borrower, title: "Borrow request update", message: `Your request for ${borrowRequest.tool.name} was ${borrowRequest.status}.` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(borrowRequest.borrower), { id: note._id, title: note.title, message: note.message }); } catch (e) {}
  } catch (e) { }
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
  try {
    const note = await Notification.create({ user: borrowRequest.owner, title: "Return submitted", message: `${req.user.fullName || 'A borrower'} submitted return evidence for ${borrowRequest.tool.name}.` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(borrowRequest.owner), { id: note._id, title: note.title, message: note.message }); } catch (e) {}
  } catch (e) {}

  res.json({ borrowRequest, message: "Return submitted and awaiting owner verification." });
});

export const verifyReturn = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.params.id).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const isOwner = borrowRequest.owner.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Only owner or admin can verify return" });

  const returnedAt = borrowRequest.returnedAt || new Date();
  const lateDays = returnedAt > borrowRequest.endDate ? Math.ceil((returnedAt - borrowRequest.endDate) / (1000 * 60 * 60 * 24)) : 0;
  borrowRequest.status = lateDays ? "overdue" : "completed";
  borrowRequest.tool.status = "available";
  borrowRequest.tool.healthScore = Math.max(0, borrowRequest.tool.healthScore - (lateDays ? 4 : 1));
  await borrowRequest.tool.save();
  await borrowRequest.save();

  await BorrowTransaction.findOneAndUpdate(
    { borrowRequest: borrowRequest._id },
    { returnedAt, lateDays, status: lateDays ? "disputed" : "completed" },
    { new: true }
  );

  // Release escrow
  await adjustTrustPoints({
    userId: borrowRequest.borrower,
    community: borrowRequest.community,
    amount: borrowRequest.escrowPoints,
    type: "escrow_release",
    reason: "Borrowing escrow released",
    relatedTool: borrowRequest.tool._id,
    relatedBorrowRequest: borrowRequest._id
  });

  if (lateDays) {
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: -lateDays * 5,
      type: "penalty",
      reason: `Late return penalty: ${lateDays} day(s)`,
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
  } else {
    await adjustTrustPoints({
      userId: borrowRequest.borrower,
      community: borrowRequest.community,
      amount: 3,
      type: "reward",
      reason: "Successful on-time return",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
    await adjustTrustPoints({
      userId: borrowRequest.owner,
      community: borrowRequest.community,
      amount: 8,
      type: "reward",
      reason: "Lending reward",
      relatedTool: borrowRequest.tool._id,
      relatedBorrowRequest: borrowRequest._id
    });
  }

  // notify borrower that return was verified and escrow released
  try {
    const note = await Notification.create({ user: borrowRequest.borrower, title: "Return verified", message: `Your return for ${borrowRequest.tool.name} was verified. Escrow released.` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(borrowRequest.borrower), { id: note._id, title: note.title, message: note.message }); } catch (e) {}
  } catch (e) {}

  res.json({ borrowRequest });
});
