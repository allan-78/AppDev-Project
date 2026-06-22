import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.get("/profile", asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-passwordHash -refreshTokenHash").populate("community", "name location joinCode");
  res.json({ user });
}));

router.patch("/profile", asyncHandler(async (req, res) => {
  const allowed = ["fullName", "phone", "address", "avatarUrl", "idImageUrl", "bio"];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash -refreshTokenHash");
  res.json({ user });
}));

router.get("/trust-points", asyncHandler(async (req, res) => {
  const transactions = await TrustPointTransaction.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ transactions });
}));

export default router;
