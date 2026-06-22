import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { Tool } from "../models/Tool.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { Dispute } from "../models/Dispute.js";
import { MaintenanceCase } from "../models/MaintenanceCase.js";
import { AuditLog } from "../models/AuditLog.js";
import { audit } from "../services/auditService.js";

export const dashboard = asyncHandler(async (req, res) => {
  const community = req.user.community;
  const [totalTools, pendingUsers, activeBorrowings, overdue, disputes, maintenanceCases] = await Promise.all([
    Tool.countDocuments({ community }),
    User.countDocuments({ community, status: "pending" }),
    BorrowRequest.countDocuments({ community, status: { $in: ["approved", "picked_up"] } }),
    BorrowRequest.countDocuments({ community, status: "overdue" }),
    Dispute.countDocuments({ community, status: { $in: ["open", "under_review"] } }),
    MaintenanceCase.countDocuments({ community, status: { $ne: "resolved" } })
  ]);
  res.json({ totalTools, pendingUsers, activeBorrowings, overdue, disputes, maintenanceCases });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ community: req.user.community })
    .select("-passwordHash -refreshTokenHash")
    .sort({ status: 1, createdAt: -1 });
  res.json({ users });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, community: req.user.community },
    { status: req.body.status },
    { new: true }
  ).select("-passwordHash -refreshTokenHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  await audit(req.user, "user.status", "User", user._id, { status: user.status });
  res.json({ user });
});

export const auditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({ community: req.user.community }).populate("actor", "fullName role").sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
});
