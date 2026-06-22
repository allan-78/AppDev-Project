import { Router } from "express";
import { createMaintenance, listMaintenance, resolveMaintenance } from "../controllers/maintenanceController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, authorize("admin", "superAdmin"));
router.get("/", listMaintenance);
router.post("/", createMaintenance);
router.patch("/:id/resolve", resolveMaintenance);

export default router;
