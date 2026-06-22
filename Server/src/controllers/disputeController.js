import { asyncHandler } from "../utils/asyncHandler.js";
import { Dispute } from "../models/Dispute.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { adjustTrustPoints } from "../services/trustService.js";

export const listDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({ community: req.user.community })
    .populate("tool", "name")
    .populate("reportedBy againstUser", "fullName email")
    .sort({ createdAt: -1 });
  res.json({ disputes });
});

export const createDispute = asyncHandler(async (req, res) => {
  const borrowRequest = await BorrowRequest.findById(req.body.borrowRequest);
  if (!borrowRequest) return res.status(404).json({ message: "Borrow request not found" });
  const dispute = await Dispute.create({
    borrowRequest: borrowRequest._id,
    tool: borrowRequest.tool,
    reportedBy: req.user._id,
    againstUser: req.body.againstUser || borrowRequest.borrower,
    community: borrowRequest.community,
    type: req.body.type,
    description: req.body.description,
    evidenceUrls: req.body.evidenceUrls || []
  });
  borrowRequest.status = "disputed";
  await borrowRequest.save();
  res.status(201).json({ dispute });
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) return res.status(404).json({ message: "Dispute not found" });
  dispute.status = req.body.status || "resolved";
  dispute.resolution = req.body.resolution;
  dispute.penaltyPoints = Number(req.body.penaltyPoints || 0);
  dispute.resolvedBy = req.user._id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  if (dispute.penaltyPoints > 0 && dispute.againstUser) {
    await adjustTrustPoints({
      userId: dispute.againstUser,
      community: dispute.community,
      amount: -dispute.penaltyPoints,
      type: "penalty",
      reason: `Dispute penalty: ${dispute.type}`,
      relatedTool: dispute.tool,
      relatedBorrowRequest: dispute.borrowRequest
    });
  }

  res.json({ dispute });
});
