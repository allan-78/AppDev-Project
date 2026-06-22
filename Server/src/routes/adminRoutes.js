import { Router } from "express";
import { auditLogs, dashboard, listUsers, updateUserStatus } from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "superAdmin"));
router.get("/dashboard", dashboard);
router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/audit-logs", auditLogs);

export default router;
