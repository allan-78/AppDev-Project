import { Router } from "express";
import { notifications, reports, uploadImage } from "../controllers/miscController.js";
import { authorize, protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/notifications", protect, notifications);
router.post("/uploads/image", protect, upload.single("image"), uploadImage);
router.get("/reports", protect, authorize("admin", "superAdmin"), reports);

export default router;
