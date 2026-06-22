import mongoose from "mongoose";

const checklistSchema = new mongoose.Schema(
  {
    safetyConfirmed: { type: Boolean, default: false },
    cleanConfirmed: { type: Boolean, default: false },
    photoEvidenceUrl: String,
    notes: String
  },
  { _id: false }
);

const borrowRequestSchema = new mongoose.Schema(
  {
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "picked_up", "returned", "overdue", "disputed", "completed", "cancelled"],
      default: "requested"
    },
    escrowPoints: { type: Number, default: 0 },
    priorityScore: { type: Number, default: 0 },
    requestNote: String,
    pickupChecklist: checklistSchema,
    returnChecklist: checklistSchema,
    approvedAt: Date,
    returnedAt: Date
  },
  { timestamps: true }
);

export const BorrowRequest = mongoose.model("BorrowRequest", borrowRequestSchema);
