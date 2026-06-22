import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest", required: true },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    againstUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    type: { type: String, enum: ["damage", "late_return", "missing_item", "other"], required: true },
    description: { type: String, required: true },
    evidenceUrls: [String],
    status: { type: String, enum: ["open", "under_review", "resolved", "dismissed"], default: "open" },
    resolution: String,
    penaltyPoints: { type: Number, default: 0 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date
  },
  { timestamps: true }
);

export const Dispute = mongoose.model("Dispute", disputeSchema);
