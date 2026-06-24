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

export async function transferTrustPoints({ fromUserId, toIdentifier, amount, community }) {
  amount = Number(amount);
  if (!amount || amount <= 0) {
    const e = new Error("Invalid transfer amount");
    e.statusCode = 400;
    throw e;
  }

  const fromUser = await User.findById(fromUserId);
  if (!fromUser) throw new Error("Sender not found");

  const isEmail = typeof toIdentifier === "string" && toIdentifier.includes("@");
  const query = isEmail ? { email: toIdentifier.toLowerCase() } : { username: toIdentifier };
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

  await TrustPointTransaction.create({
    user: fromUser._id,
    community,
    amount: -Math.abs(amount),
    type: "transfer_out",
    reason: `Transfer to ${toUser.email || toUser.username}`,
    balanceAfter: fromUser.trustPoints,
    lockedAfter: fromUser.lockedPoints
  });

  await TrustPointTransaction.create({
    user: toUser._id,
    community,
    amount: Math.abs(amount),
    type: "transfer_in",
    reason: `Transfer from ${fromUser.email || fromUser.username}`,
    balanceAfter: toUser.trustPoints,
    lockedAfter: toUser.lockedPoints
  });

  return { fromUser, toUser };
}
