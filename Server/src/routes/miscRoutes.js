import { Router } from "express";
import { notifications, registerPushToken, reports, uploadImage, markAsRead, markAllAsRead } from "../controllers/miscController.js";
import { authorize, protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validateMongoId } from "../validators/commonValidator.js";

const router = Router();

router.get("/notifications", protect, notifications);
router.patch("/notifications/read-all", protect, markAllAsRead);
router.patch("/notifications/:id/read", protect, validateMongoId, markAsRead);
router.post("/notifications/push-token", protect, registerPushToken);
router.post("/uploads/image", protect, upload.single("image"), uploadImage);
router.post("/uploads/media", protect, upload.single("media"), uploadImage);
router.get("/reports", protect, authorize("admin", "superAdmin"), reports);

export default router;
