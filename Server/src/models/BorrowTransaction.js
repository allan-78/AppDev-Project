import mongoose from "mongoose";

const borrowTransactionSchema = new mongoose.Schema(
  {
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest", required: true },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    startedAt: Date,
    returnedAt: Date,
    lateDays: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed", "disputed"], default: "active" }
  },
  { timestamps: true }
);

export const BorrowTransaction = mongoose.model("BorrowTransaction", borrowTransactionSchema);
