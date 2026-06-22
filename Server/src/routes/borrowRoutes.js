import { Router } from "express";
import { complainBorrowRequest, createBorrowRequest, decideBorrowRequest, listBorrowRequests, pickupBorrowRequest, returnBorrowRequest } from "../controllers/borrowController.js";
import { protect, requireApprovedResident } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listBorrowRequests);
router.post("/", requireApprovedResident, createBorrowRequest);
router.patch("/:id/decision", decideBorrowRequest);
router.patch("/:id/pickup", requireApprovedResident, pickupBorrowRequest);
router.patch("/:id/return", requireApprovedResident, returnBorrowRequest);
router.post("/:id/complaints", requireApprovedResident, complainBorrowRequest);

export default router;
