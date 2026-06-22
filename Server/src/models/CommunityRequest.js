import mongoose from "mongoose";

const communityRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Education", "Home", "Garden", "Sports", "Faith", "Business", "Safety", "Other"],
      default: "Other"
    },
    location: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sourceCommunity: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    trustPointCost: { type: Number, default: 50 },
    adminNote: String,
    approvedCommunity: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date
  },
  { timestamps: true }
);

export const CommunityRequest = mongoose.model("CommunityRequest", communityRequestSchema);
