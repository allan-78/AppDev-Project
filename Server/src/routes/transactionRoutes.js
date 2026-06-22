import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { BorrowTransaction } from "../models/BorrowTransaction.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.get("/", asyncHandler(async (req, res) => {
  const query = { community: req.user.community };
  if (req.user.role === "resident") query.$or = [{ borrower: req.user._id }, { owner: req.user._id }];
  const transactions = await BorrowTransaction.find(query)
    .populate("tool", "name")
    .populate("borrower owner", "fullName")
    .sort({ createdAt: -1 });
  res.json({ transactions });
}));

export default router;
