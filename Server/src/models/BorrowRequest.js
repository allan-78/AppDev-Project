import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    resourceType: { type: String, enum: ["image", "video"], default: "image" }
  },
  { _id: false }
);

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
      enum: ["requested", "admin_review", "verified", "approved", "rejected", "picked_up", "returned", "overdue", "disputed", "completed", "cancelled"],
      default: "admin_review"
    },
    escrowPoints: { type: Number, default: 0 },
    evidenceUrls: [{ type: String }],
    initialEvidenceUrl: { type: String },
    evidenceMedia: [mediaAssetSchema],
    initialEvidenceMedia: mediaAssetSchema,
    adminVerification: {
      status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
      note: String,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: Date
    },
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
