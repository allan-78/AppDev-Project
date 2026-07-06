import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinary } from "../config/cloudinary.js";
import { Notification } from "../models/Notification.js";
import { Tool } from "../models/Tool.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { User } from "../models/User.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Media file is required" });
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(503).json({ message: "Cloudinary is required for media uploads" });
  }
  const resourceType = req.file.mimetype.startsWith("video/") ? "video" : "image";
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "neighborhoodshare",
    resource_type: resourceType
  });
  await fs.unlink(req.file.path).catch(() => {});
  res.status(201).json({ url: result.secure_url, publicId: result.public_id, resourceType });
});

export const registerPushToken = asyncHandler(async (req, res) => {
  const { token, platform = "unknown" } = req.body;
  if (!token) return res.status(400).json({ message: "Push token is required" });

  const user = await User.findById(req.user._id);
  const existing = (user.pushTokens || []).find((item) => item.token === token);
  if (existing) {
    existing.platform = platform;
    existing.updatedAt = new Date();
  } else {
    user.pushTokens.push({ token, platform, updatedAt: new Date() });
  }
  await user.save();
  res.status(201).json({ ok: true });
});

export const notifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ notifications: items });
});

export const reports = asyncHandler(async (req, res) => {
  const [mostBorrowedTools, topLenders, highestRiskBorrowers, toolsNeedingReplacement, monthlyActivity] = await Promise.all([
    Tool.find({ community: req.user.community }).sort({ borrowCount: -1 }).limit(5).populate("owner", "fullName"),
    User.find({ community: req.user.community, role: "resident" }).sort({ trustPoints: -1 }).limit(5).select("fullName trustPoints"),
    User.find({ community: req.user.community, role: "resident" }).sort({ trustPoints: 1 }).limit(5).select("fullName trustPoints status"),
    Tool.find({ community: req.user.community, healthScore: { $lt: 45 } }).sort({ healthScore: 1 }).limit(10),
    BorrowRequest.aggregate([
      { $match: { community: req.user.community } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  res.json({ mostBorrowedTools, topLenders, highestRiskBorrowers, toolsNeedingReplacement, monthlyActivity });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!item) return res.status(404).json({ message: "Notification not found" });
  res.json({ notification: item });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { isRead: true });
  res.json({ success: true, message: "All notifications marked as read" });
});
