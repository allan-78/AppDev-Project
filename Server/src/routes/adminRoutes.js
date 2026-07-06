import { Router } from "express";
import {
  adminCommunities,
  auditLogs,
  borrowVerificationQueue,
  broadcastAnnouncement,
  createToolAsAdmin,
  dashboard,
  deleteUser,
  exportReportPdf,
  listUsers,
  updateUserStatus
} from "../controllers/adminController.js";
import { reviewBorrowVerification } from "../controllers/borrowController.js";
import { authorize, protect } from "../middleware/auth.js";
import { validateUpdateUserStatus, validateBroadcastAnnouncement } from "../validators/adminValidator.js";
import { validateMongoId } from "../validators/commonValidator.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { notifyUser } from "../services/notificationService.js";

const router = Router();

router.use(protect, authorize("admin", "superAdmin"));
router.get("/dashboard", dashboard);
router.get("/users", listUsers);
router.patch("/users/:id/status", validateMongoId, validateUpdateUserStatus, updateUserStatus);
router.delete("/users/:id", validateMongoId, deleteUser);
router.post("/tools", createToolAsAdmin);
router.post("/announcements", validateBroadcastAnnouncement, broadcastAnnouncement);
router.get("/communities", adminCommunities);
router.get("/borrow-verifications", borrowVerificationQueue);
router.patch("/borrow-verifications/:id", validateMongoId, reviewBorrowVerification);
router.get("/reports/:type.pdf", exportReportPdf);
router.get("/audit-logs", auditLogs);

// ID Verification queue — list users with pending ID submissions
router.get("/id-verifications", asyncHandler(async (req, res) => {
  const users = await User.find({ idImageUrl: { $exists: true, $ne: "" }, idVerified: false })
    .select("fullName email phone address idImageUrl status createdAt")
    .sort({ createdAt: -1 });
  res.json({ users });
}));

// Approve or reject a user's ID verification
router.patch("/users/:id/verify-id", validateMongoId, asyncHandler(async (req, res) => {
  const { decision, reason } = req.body; // decision: "approve" | "reject"
  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approve' or 'reject'" });
  }

  const updates = decision === "approve"
    ? { idVerified: true, status: "approved" }
    : { idVerified: false, status: "rejected" };

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash -refreshTokenHash");
  if (!user) return res.status(404).json({ message: "User not found" });

  // Notify the user
  await notifyUser(user._id, {
    title: decision === "approve" ? "Account Verified!" : "Verification Rejected",
    message: decision === "approve"
      ? "Your ID has been verified. Your account is now fully active."
      : `Your ID verification was rejected. ${reason || "Please re-submit with a clearer photo."}`,
    type: "verification",
    data: { decision }
  });

  res.json({ user, message: `User ${decision}d successfully.` });
}));

export default router;
