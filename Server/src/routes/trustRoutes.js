import { Router } from "express";
import { authorize, protect } from "../middleware/auth.js";
import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { adjustTrustPoints } from "../services/trustService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.get("/", asyncHandler(async (req, res) => {
  const query = req.user.role === "resident" ? { user: req.user._id } : { community: req.user.community };
  const transactions = await TrustPointTransaction.find(query).populate("user", "fullName email").sort({ createdAt: -1 });
  res.json({ transactions });
}));

router.post("/adjust", authorize("admin", "superAdmin"), asyncHandler(async (req, res) => {
  const user = await adjustTrustPoints({
    userId: req.body.user,
    community: req.user.community,
    amount: Number(req.body.amount),
    type: "admin_adjustment",
    reason: req.body.reason || "Admin adjustment"
  });
  res.json({ user });
}));

export default router;
