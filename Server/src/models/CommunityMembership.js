import mongoose from "mongoose";

const communityMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    role: { type: String, enum: ["member", "creator", "moderator", "admin"], default: "member" },
    status: { type: String, enum: ["active", "pending", "blocked"], default: "active" },
    isDefault: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

communityMembershipSchema.index({ user: 1, community: 1 }, { unique: true });
communityMembershipSchema.index({ community: 1, status: 1 });

export const CommunityMembership = mongoose.model("CommunityMembership", communityMembershipSchema);
