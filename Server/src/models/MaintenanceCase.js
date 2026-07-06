import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest" },
    weight: Number,
    pointShare: Number,
    reason: String,
    status: { type: String, enum: ["pending", "accepted", "disputed"], default: "pending" },
    respondedAt: Date,
    disputedReason: String
  },
  { _id: false }
);

const maintenanceCaseSchema = new mongoose.Schema(
  {
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issue: { type: String, required: true },
    estimatedPointCost: { type: Number, default: 50 },
    allocationMethod: { type: String, enum: ["equal", "duration-weighted", "usage-weighted"], default: "usage-weighted" },
    evidenceImages: [String],
    allocations: [allocationSchema],
    status: { type: String, enum: ["open", "allocated", "resolved"], default: "open" },
    resolvedAt: Date
  },
  { timestamps: true }
);

export const MaintenanceCase = mongoose.model("MaintenanceCase", maintenanceCaseSchema);
