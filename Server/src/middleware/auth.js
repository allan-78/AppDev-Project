import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select("-passwordHash -refreshTokenHash");
    if (!user) return res.status(401).json({ message: "Invalid session" });
    if (user.status === "suspended") return res.status(403).json({ message: "Account suspended" });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function requireApprovedResident(req, res, next) {
  if (req.user.role === "resident" && req.user.status !== "approved") {
    return res.status(403).json({ message: "Resident account is not approved yet" });
  }
  next();
}
