import mongoose from "mongoose";

const trustPointTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["reward", "penalty", "escrow_lock", "escrow_release", "admin_adjustment", "maintenance_share", "community_creation_fee"],
      required: true
    },
    reason: { type: String, required: true },
    relatedTool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool" },
    relatedBorrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest" },
    balanceAfter: Number,
    lockedAfter: Number
  },
  { timestamps: true }
);

export const TrustPointTransaction = mongoose.model("TrustPointTransaction", trustPointTransactionSchema);
