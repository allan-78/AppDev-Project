import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { User } from "../models/User.js";

export async function adjustTrustPoints({ userId, community, amount, type, reason, relatedTool, relatedBorrowRequest, session }) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const saveOptions = session ? { session } : {};

  if (type === "escrow_lock") {
    if (user.trustPoints < Math.abs(amount)) {
      const error = new Error("Not enough trust points for escrow");
      error.statusCode = 400;
      throw error;
    }
    user.trustPoints -= Math.abs(amount);
    user.lockedPoints += Math.abs(amount);
  } else if (type === "escrow_release") {
    user.lockedPoints = Math.max(0, user.lockedPoints - Math.abs(amount));
    user.trustPoints += Math.abs(amount);
  } else {
    user.trustPoints = Math.max(0, user.trustPoints + amount);
  }

  await user.save(saveOptions);
  await TrustPointTransaction.create([{
    user: user._id,
    community,
    type,
    amount,
    reason,
    relatedTool,
    relatedBorrowRequest,
    balanceAfter: user.trustPoints,
    lockedAfter: user.lockedPoints
  }], saveOptions);

  return user;
}

export function getPriorityScore(user, requestedDays = 1) {
  const trustWeight = user.trustPoints * 1.5;
  const lendingWeight = Math.min(user.lockedPoints, 50) * -0.2;
  const durationWeight = Math.max(0, 10 - requestedDays);
  return Math.round(trustWeight + lendingWeight + durationWeight);
}

export async function transferTrustPoints({ fromUserId, toIdentifier, amount, community }) {
  amount = Number(amount);
  if (!amount || amount <= 0) {
    const e = new Error("Invalid transfer amount");
    e.statusCode = 400;
    throw e;
  }

  const fromUser = await User.findById(fromUserId);
  if (!fromUser) throw new Error("Sender not found");

  // FIX: User model uses 'email' and 'fullName', not 'username'
  const isEmail = typeof toIdentifier === "string" && toIdentifier.includes("@");
  const query = isEmail ? { email: toIdentifier.toLowerCase() } : { fullName: toIdentifier };
  const toUser = await User.findOne(query);
  if (!toUser) {
    const e = new Error("Recipient not found");
    e.statusCode = 404;
    throw e;
  }

  if (fromUser.trustPoints < Math.abs(amount)) {
    const e = new Error("Not enough trust points");
    e.statusCode = 400;
    throw e;
  }

  fromUser.trustPoints = Math.max(0, fromUser.trustPoints - Math.abs(amount));
  toUser.trustPoints = Math.max(0, toUser.trustPoints + Math.abs(amount));

  await fromUser.save();
  await toUser.save();

  // FIX: Use valid enum types ('penalty' for outgoing, 'reward' for incoming)
  // since TrustPointTransaction enum doesn't include 'transfer_out'/'transfer_in'
  await TrustPointTransaction.create({
    user: fromUser._id,
    community,
    amount: -Math.abs(amount),
    type: "penalty",
    reason: `Transfer to ${toUser.email}`,
    balanceAfter: fromUser.trustPoints,
    lockedAfter: fromUser.lockedPoints
  });

  await TrustPointTransaction.create({
    user: toUser._id,
    community,
    amount: Math.abs(amount),
    type: "reward",
    reason: `Transfer from ${fromUser.email}`,
    balanceAfter: toUser.trustPoints,
    lockedAfter: toUser.lockedPoints
  });

  return { fromUser, toUser };
}

export function getTrustTier(score) {
  if (score >= 76) return "Platinum";
  if (score >= 51) return "Gold";
  if (score >= 26) return "Silver";
  return "Bronze";
}

export function getTrustTierData(score) {
  const tier = getTrustTier(score);
  const tierColors = {
    Bronze: "#CD7F32",
    Silver: "#C0C0C0",
    Gold: "#FFD700",
    Platinum: "#E5E4E2"
  };
  const tierThresholds = {
    Bronze: { min: 0, max: 25 },
    Silver: { min: 26, max: 50 },
    Gold: { min: 51, max: 75 },
    Platinum: { min: 76, max: 100 }
  };
  return {
    tier,
    color: tierColors[tier],
    ...tierThresholds[tier]
  };
}

export async function getLifetimeStats(userId) {
  const transactions = await TrustPointTransaction.find({ user: userId });
  
  const stats = {
    totalEarned: 0,
    totalSpent: 0,
    transactions: transactions.length,
    byType: {}
  };

  for (const tx of transactions) {
    if (tx.amount > 0) {
      stats.totalEarned += tx.amount;
    } else {
      stats.totalSpent += Math.abs(tx.amount);
    }
    
    stats.byType[tx.type] = (stats.byType[tx.type] || 0) + tx.amount;
  }

  const user = await User.findById(userId);
  stats.currentScore = user?.trustPoints || 0;
  stats.currentTier = getTrustTier(stats.currentScore);
  
  return stats;
}
