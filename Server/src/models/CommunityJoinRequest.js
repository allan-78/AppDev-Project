import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    resourceType: { type: String, enum: ["image", "video"], default: "image" }
  },
  { _id: false }
);

const communityJoinRequestSchema = new mongoose.Schema(
  {
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    idImageUrl: { type: String },
    idMedia: mediaAssetSchema,
    answers: { type: Map, of: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    adminNote: String
  },
  { timestamps: true }
);

export const CommunityJoinRequest = mongoose.model("CommunityJoinRequest", communityJoinRequestSchema);
