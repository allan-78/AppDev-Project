import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken } from "../utils/tokens.js";
import { User } from "../models/User.js";
import { Community } from "../models/Community.js";

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    status: user.status,
    community: user.community,
    avatarUrl: user.avatarUrl,
    trustPoints: user.trustPoints,
    lockedPoints: user.lockedPoints
  };
}

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, address, joinCode } = req.body;
  const community = await Community.findOne({ joinCode: String(joinCode || "").toUpperCase() });
  if (!community) return res.status(400).json({ message: "Invalid community join code" });

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return res.status(409).json({ message: "Email is already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    fullName,
    email,
    passwordHash,
    phone,
    address,
    community: community._id,
    trustPoints: community.trustRules.startingPoints,
    status: "pending",
    role: "resident"
  });

  res.status(201).json({ user: publicUser(user), message: "Registration submitted for admin approval" });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).populate("community", "name joinCode trustRules");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status === "rejected") return res.status(403).json({ message: "Account was rejected" });

  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLoginAt = new Date();
  await user.save();

  res.json({ user: publicUser(user), accessToken: signAccessToken(user), refreshToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken is required" });
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  res.json({ accessToken: signAccessToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("community", "name location joinCode trustRules");
  res.json({ user: publicUser(user) });
});
