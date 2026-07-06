import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest", required: true },
    rater: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ratee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
    type: { type: String, enum: ["borrower_to_lender", "lender_to_borrower"], required: true }
  },
  { timestamps: true }
);

ratingSchema.index({ borrowRequest: 1, rater: 1 }, { unique: true });
ratingSchema.index({ ratee: 1 });

export const Rating = mongoose.model("Rating", ratingSchema);
