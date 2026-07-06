import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { Tool } from "../models/Tool.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { Dispute } from "../models/Dispute.js";
import { MaintenanceCase } from "../models/MaintenanceCase.js";
import { AuditLog } from "../models/AuditLog.js";
import { Community } from "../models/Community.js";
import { CommunityRequest } from "../models/CommunityRequest.js";
import { CommunityJoinRequest } from "../models/CommunityJoinRequest.js";
import { CommunityPost } from "../models/CommunityPost.js";
import { CommunityMembership } from "../models/CommunityMembership.js";
import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { BorrowTransaction } from "../models/BorrowTransaction.js";
import { audit } from "../services/auditService.js";
import { notifyUsers } from "../services/notificationService.js";

function pdfBuffer(title, lines) {
  const safeLines = [title, "", ...(lines || [])].map((line) => String(line || "").replace(/[()\\]/g, ""));
  const content = `BT /F1 14 Tf 50 780 Td ${safeLines.map((line, index) => `${index ? "0 -18 Td " : ""}(${line}) Tj`).join(" ")} ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${obj}\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

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
  if (user.status === "approved" && user.community) {
    await CommunityMembership.findOneAndUpdate(
      { user: user._id, community: user.community },
      { $set: { status: "active", isDefault: true, joinedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  await audit(req.user, "user.status", "User", user._id, { status: user.status });
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, community: req.user.community },
    { status: "suspended" },
    { new: true }
  ).select("-passwordHash -refreshTokenHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  await CommunityMembership.updateMany({ user: user._id }, { status: "blocked" });
  await audit(req.user, "user.delete", "User", user._id, { softDelete: true });
  res.json({ user });
});

export const createToolAsAdmin = asyncHandler(async (req, res) => {
  // FIX: Whitelist allowed fields instead of spreading req.body
  const allowedFields = ['name', 'description', 'category', 'condition', 'rules', 'pickupLocation', 'availableWindows', 'securityNotes', 'requiresIdCheck', 'requiresPhotoEvidence', 'maxBorrowDays', 'depositPoints', 'images'];
  const owner = req.body.owner || req.user._id;
  const community = req.body.community || req.user.community;
  const toolData = { owner, community };
  allowedFields.forEach(field => { if (req.body[field] !== undefined) toolData[field] = req.body[field]; });
  const tool = await Tool.create(toolData);
  await audit(req.user, "tool.admin.create", "Tool", tool._id, { name: tool.name });
  res.status(201).json({ tool });
});

export const broadcastAnnouncement = asyncHandler(async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ message: "Title and message are required" });
  const residents = await User.find({ community: req.user.community, status: "approved" }).select("_id");
  await notifyUsers(residents.map((user) => user._id), { title, message, type: "announcement" });
  await audit(req.user, "announcement.broadcast", "Notification", req.user.community, { title });
  res.status(201).json({ sent: residents.length });
});

export const adminCommunities = asyncHandler(async (req, res) => {
  const [communities, creationRequests, joinRequests, posts] = await Promise.all([
    Community.find({}).populate("createdBy", "fullName email").sort({ createdAt: -1 }),
    CommunityRequest.find({}).populate("requestedBy", "fullName email trustPoints").populate("approvedCommunity", "name joinCode").sort({ createdAt: -1 }),
    CommunityJoinRequest.find({}).populate("applicant", "fullName email trustPoints").populate("community", "name location").sort({ createdAt: -1 }),
    CommunityPost.find({}).populate("author", "fullName email").populate("community", "name").sort({ createdAt: -1 }).limit(100)
  ]);
  res.json({ communities, creationRequests, joinRequests, posts });
});

export const borrowVerificationQueue = asyncHandler(async (req, res) => {
  const requests = await BorrowRequest.find({ community: req.user.community })
    .populate("tool", "name images status")
    .populate("borrower", "fullName email trustPoints idImageUrl idVerified")
    .populate("owner", "fullName email")
    .populate("community", "name")
    .sort({ createdAt: -1 });
  res.json({ requests });
});

export const exportReportPdf = asyncHandler(async (req, res) => {
  const type = req.params.type;
  let lines = [];
  if (type === "inventory") {
    const tools = await Tool.find({ community: req.user.community }).populate("owner", "fullName").sort("name");
    lines = tools.map((tool) => `${tool.name} | ${tool.status} | ${tool.condition} | ${tool.owner?.fullName || "Unknown"}`);
  } else if (type === "trust") {
    const users = await User.find({ community: req.user.community }).sort({ trustPoints: -1 });
    lines = users.map((user) => `${user.fullName} | ${user.email} | ${user.trustPoints} trust | ${user.status}`);
  } else if (type === "transactions") {
    const [trust, borrows] = await Promise.all([
      TrustPointTransaction.find({ community: req.user.community }).populate("user", "fullName").sort({ createdAt: -1 }).limit(50),
      BorrowTransaction.find({ community: req.user.community }).populate("tool", "name").populate("borrower", "fullName").sort({ createdAt: -1 }).limit(50)
    ]);
    lines = [
      ...trust.map((tx) => `Trust | ${tx.user?.fullName || "User"} | ${tx.type} | ${tx.amount}`),
      ...borrows.map((tx) => `Borrow | ${tx.tool?.name || "Tool"} | ${tx.borrower?.fullName || "Borrower"} | ${tx.status}`)
    ];
  } else {
    return res.status(404).json({ message: "Unknown report type" });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.pdf"`);
  res.send(pdfBuffer(`${type.toUpperCase()} REPORT`, lines.slice(0, 35)));
});

export const auditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({ community: req.user.community }).populate("actor", "fullName role").sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
});
