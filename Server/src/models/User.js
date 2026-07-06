import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    role: { type: String, enum: ["resident", "admin", "superAdmin"], default: "resident" },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending"
    },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    avatarUrl: String,
    idImageUrl: String,
    idVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    bio: { type: String, default: "" },
    badges: [{ type: String, trim: true }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pushTokens: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ["ios", "android", "web", "unknown"], default: "unknown" },
      updatedAt: { type: Date, default: Date.now }
    }],
    trustPoints: { type: Number, default: 100 },
    lockedPoints: { type: Number, default: 0 },
    refreshTokenHash: String,
    passwordResetTokenHash: String,
    passwordResetExpires: Date,
    lastLoginAt: Date
  },
  { timestamps: true }
);

// Virtual to compute trust tier based on trustPoints
userSchema.virtual("trustTier").get(function() {
  if (this.trustPoints >= 76) return "Platinum";
  if (this.trustPoints >= 51) return "Gold";
  if (this.trustPoints >= 26) return "Silver";
  return "Bronze";
});

// Index for leaderboard and distribution queries
userSchema.index({ trustPoints: -1 });

// Ensure virtuals are included in JSON responses
userSchema.set("toJSON", { virtuals: true });

export const User = mongoose.model("User", userSchema);
