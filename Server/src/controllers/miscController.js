import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cloudinary } from "../config/cloudinary.js";
import { Notification } from "../models/Notification.js";
import { Tool } from "../models/Tool.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { User } from "../models/User.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Image file is required" });
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    const url = `${req.protocol}://${req.get("host")}/uploads-temp/${req.file.filename}`;
    return res.status(201).json({ url, publicId: req.file.filename, storage: "local" });
  }
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "neighborhoodshare",
    resource_type: "image"
  });
  await fs.unlink(req.file.path).catch(() => {});
  res.status(201).json({ url: result.secure_url, publicId: result.public_id });
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
