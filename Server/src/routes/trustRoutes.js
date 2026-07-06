import { Router } from "express";
import { authorize, protect } from "../middleware/auth.js";
import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { User } from "../models/User.js";
import { adjustTrustPoints, getTrustTier, getLifetimeStats } from "../services/trustService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

router.get("/", asyncHandler(async (req, res) => {
  const query = req.user.role === "resident" ? { user: req.user._id } : { community: req.user.community };
  const transactions = await TrustPointTransaction.find(query).populate("user", "fullName email").sort({ createdAt: -1 });
  res.json({ transactions });
}));

router.get("/my-stats", asyncHandler(async (req, res) => {
  const stats = await getLifetimeStats(req.user._id);
  res.json(stats);
}));

router.post("/adjust", authorize("admin", "superAdmin"), asyncHandler(async (req, res) => {
  const user = await adjustTrustPoints({
    userId: req.body.user,
    community: req.user.community,
    amount: Number(req.body.amount),
    type: "admin_adjustment",
    reason: req.body.reason || "Admin adjustment"
  });
  res.json({ user, trustTier: user.trustTier });
}));

router.get("/admin/trust-distribution", authorize("admin", "superAdmin"), asyncHandler(async (req, res) => {
  const users = await User.find({ community: req.user.community }).select("trustPoints");
  
  const distribution = {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Platinum: 0
  };

  for (const user of users) {
    const tier = getTrustTier(user.trustPoints);
    distribution[tier]++;
  }

  res.json({
    total: users.length,
    distribution,
    percentages: {
      Bronze: Math.round((distribution.Bronze / users.length) * 100),
      Silver: Math.round((distribution.Silver / users.length) * 100),
      Gold: Math.round((distribution.Gold / users.length) * 100),
      Platinum: Math.round((distribution.Platinum / users.length) * 100)
    }
  });
}));

router.get("/admin/trust-leaderboard", authorize("admin", "superAdmin"), asyncHandler(async (req, res) => {
  const topUsers = await User.find({ community: req.user.community })
    .select("fullName email trustPoints")
    .sort({ trustPoints: -1 })
    .limit(10);

  const bottomUsers = await User.find({ community: req.user.community })
    .select("fullName email trustPoints")
    .sort({ trustPoints: 1 })
    .limit(10);

  const formatted = (users) => users.map(u => ({
    _id: u._id,
    fullName: u.fullName,
    email: u.email,
    trustPoints: u.trustPoints,
    trustTier: getTrustTier(u.trustPoints)
  }));

  res.json({
    top: formatted(topUsers),
    bottom: formatted(bottomUsers)
  });
}));

export default router;
