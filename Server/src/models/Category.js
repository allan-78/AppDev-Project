import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: "tool" },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
