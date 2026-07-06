import { Router } from "express";
import { createMaintenance, listMaintenance, resolveMaintenance, listMyCharges, acceptCharge, disputeCharge, getToolMaintenanceHistory } from "../controllers/maintenanceController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);

// Resident endpoints
router.get("/my-charges", listMyCharges);
router.patch("/:id/accept", acceptCharge);
router.patch("/:id/dispute", disputeCharge);
router.get("/tool/:toolId/history", getToolMaintenanceHistory);

// Admin endpoints
router.get("/", authorize("admin", "superAdmin"), listMaintenance);
router.post("/", authorize("admin", "superAdmin"), createMaintenance);
router.patch("/:id/resolve", authorize("admin", "superAdmin"), resolveMaintenance);

export default router;
