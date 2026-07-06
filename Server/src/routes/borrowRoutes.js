import { Router } from "express";
import { complainBorrowRequest, createBorrowRequest, decideBorrowRequest, listBorrowRequests, pickupBorrowRequest, returnBorrowRequest, reviewBorrowVerification, verifyReturn } from "../controllers/borrowController.js";
import { authorize, protect, requireApprovedResident } from "../middleware/auth.js";
import { validateCreateBorrow } from "../validators/borrowValidator.js";
import { validateMongoId } from "../validators/commonValidator.js";

const router = Router();

router.use(protect);
router.get("/", listBorrowRequests);
router.post("/", requireApprovedResident, validateCreateBorrow, createBorrowRequest);
router.patch("/:id/admin-verification", authorize("admin", "superAdmin"), validateMongoId, reviewBorrowVerification);
router.patch("/:id/decision", validateMongoId, decideBorrowRequest);
router.patch("/:id/pickup", requireApprovedResident, validateMongoId, pickupBorrowRequest);
router.patch("/:id/return", requireApprovedResident, validateMongoId, returnBorrowRequest);
router.post("/:id/complaints", requireApprovedResident, validateMongoId, complainBorrowRequest);
router.patch("/:id/verify-return", requireApprovedResident, validateMongoId, verifyReturn);

export default router;
