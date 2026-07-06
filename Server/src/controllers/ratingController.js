import { Rating } from "../models/Rating.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { adjustTrustPoints } from "../services/trustService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const submitRating = asyncHandler(async (req, res) => {
  const { borrowRequestId, rating, review, type } = req.body;

  if (!borrowRequestId || !rating || !type) {
    return res.status(400).json({ message: "borrowRequestId, rating, and type are required" });
  }

  const borrowRequest = await BorrowRequest.findById(borrowRequestId).populate("tool");
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });

  if (borrowRequest.status !== "completed") {
    return res.status(400).json({ message: "Ratings can only be submitted for completed borrow requests" });
  }

  const raterId = req.user._id.toString();
  const borrowerId = borrowRequest.borrower.toString();
  const ownerId = borrowRequest.owner.toString();

  let ratee;
  if (type === "borrower_to_lender") {
    if (raterId !== borrowerId) {
      return res.status(403).json({ message: "Only the borrower can rate the lender in this review type" });
    }
    ratee = ownerId;
  } else if (type === "lender_to_borrower") {
    if (raterId !== ownerId) {
      return res.status(403).json({ message: "Only the lender can rate the borrower in this review type" });
    }
    ratee = borrowerId;
  } else {
    return res.status(400).json({ message: "Invalid rating type" });
  }

  const existing = await Rating.findOne({ borrowRequest: borrowRequestId, rater: raterId });
  if (existing) {
    return res.status(400).json({ message: "You have already rated this transaction" });
  }

  const ratingDoc = await Rating.create({
    borrowRequest: borrowRequestId,
    rater: raterId,
    ratee,
    rating: Number(rating),
    review: review || "",
    type
  });

  // Award +1 trust point for leaving a review
  await adjustTrustPoints({
    userId: raterId,
    community: borrowRequest.community,
    amount: 1,
    type: "reward",
    reason: "Lending/borrowing review reward",
    relatedTool: borrowRequest.tool._id,
    relatedBorrowRequest: borrowRequest._id
  });

  res.status(201).json({ rating: ratingDoc });
});

export const getUserRatings = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const ratings = await Rating.find({ ratee: userId })
    .populate("rater", "fullName avatarUrl trustPoints")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Rating.countDocuments({ ratee: userId });

  res.json({
    ratings,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

export const getToolRatings = asyncHandler(async (req, res) => {
  const { toolId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  // Find all completed borrow requests for this tool
  const borrowRequests = await BorrowRequest.find({ tool: toolId, status: "completed" }).select("_id");
  const borrowRequestIds = borrowRequests.map(r => r._id);

  const ratings = await Rating.find({
    borrowRequest: { $in: borrowRequestIds },
    type: "borrower_to_lender" // Borrower rating the lender/tool condition
  })
    .populate("rater", "fullName avatarUrl trustPoints")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Rating.countDocuments({
    borrowRequest: { $in: borrowRequestIds },
    type: "borrower_to_lender"
  });

  res.json({
    ratings,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});
