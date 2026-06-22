import { TrustPointTransaction } from "../models/TrustPointTransaction.js";
import { User } from "../models/User.js";

export async function adjustTrustPoints({ userId, community, amount, type, reason, relatedTool, relatedBorrowRequest }) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

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

  await user.save();
  await TrustPointTransaction.create({
    user: user._id,
    community,
    amount,
    type,
    reason,
    relatedTool,
    relatedBorrowRequest,
    balanceAfter: user.trustPoints,
    lockedAfter: user.lockedPoints
  });

  return user;
}

export function getPriorityScore(user, requestedDays = 1) {
  const trustWeight = user.trustPoints * 1.5;
  const lendingWeight = Math.min(user.lockedPoints, 50) * -0.2;
  const durationWeight = Math.max(0, 10 - requestedDays);
  return Math.round(trustWeight + lendingWeight + durationWeight);
}
