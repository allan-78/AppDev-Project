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

// Public: get a user by id (for profile view)
router.get("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash -refreshTokenHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
}));

// Follow another user
router.post("/:id/follow", asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user._id.toString()) return res.status(400).json({ message: "Cannot follow yourself" });
  const target = await User.findById(targetId);
  const me = await User.findById(req.user._id);
  if (!target) return res.status(404).json({ message: "User not found" });
  if (!target.followers) target.followers = [];
  if (!me.following) me.following = [];
  if (!target.followers.includes(me._id)) target.followers.push(me._id);
  if (!me.following.includes(target._id)) me.following.push(target._id);
  await target.save();
  await me.save();
  res.json({ success: true, followers: target.followers.length, following: me.following.length });
}));

// Unfollow
router.post("/:id/unfollow", asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user._id.toString()) return res.status(400).json({ message: "Cannot unfollow yourself" });
  const target = await User.findById(targetId);
  const me = await User.findById(req.user._id);
  if (!target) return res.status(404).json({ message: "User not found" });
  target.followers = (target.followers || []).filter((id) => id.toString() !== me._id.toString());
  me.following = (me.following || []).filter((id) => id.toString() !== target._id.toString());
  await target.save();
  await me.save();
  res.json({ success: true, followers: target.followers.length, following: me.following.length });
}));

export default router;
