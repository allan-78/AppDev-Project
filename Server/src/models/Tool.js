import mongoose from "mongoose";

const toolImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    label: { type: String, enum: ["listing", "pickup", "return", "dispute"], default: "listing" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const wearLogSchema = new mongoose.Schema(
  {
    note: String,
    condition: { type: String, enum: ["excellent", "good", "fair", "needs_service", "unsafe"] },
    imageUrl: String,
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const toolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    images: [toolImageSchema],
    rules: { type: String, default: "Return clean and on time." },
    pickupLocation: { type: String, default: "" },
    availableWindows: { type: String, default: "" },
    securityNotes: { type: String, default: "" },
    requiresIdCheck: { type: Boolean, default: true },
    requiresPhotoEvidence: { type: Boolean, default: true },
    maxBorrowDays: { type: Number, default: 7 },
    condition: {
      type: String,
      enum: ["excellent", "good", "fair", "needs_service", "unsafe"],
      default: "good"
    },
    status: {
      type: String,
      enum: ["available", "reserved", "borrowed", "maintenance", "disabled"],
      default: "available"
    },
    depositPoints: { type: Number, default: 10 },
    borrowCount: { type: Number, default: 0 },
    healthScore: { type: Number, default: 100 },
    wearLogs: [wearLogSchema],
    blockedDates: [{ startDate: Date, endDate: Date, reason: String }]
  },
  { timestamps: true }
);

export const Tool = mongoose.model("Tool", toolSchema);
export const ToolImage = mongoose.model("ToolImage", toolImageSchema);
