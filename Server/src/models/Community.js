import mongoose from "mongoose";

const trustRulesSchema = new mongoose.Schema(
  {
    startingPoints: { type: Number, default: 100 },
    escrowPoints: { type: Number, default: 10 },
    latePenaltyPerDay: { type: Number, default: 5 },
    damagePenalty: { type: Number, default: 25 },
    lendingReward: { type: Number, default: 8 },
    successfulBorrowReward: { type: Number, default: 3 }
  },
  { _id: false }
);

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Education", "Home", "Garden", "Sports", "Faith", "Business", "Safety", "Other"],
      default: "Other"
    },
    description: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    trustRules: { type: trustRulesSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Community = mongoose.model("Community", communitySchema);
