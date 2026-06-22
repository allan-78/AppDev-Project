import jwt from "jsonwebtoken";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, community: user.community?.toString() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "30m" }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "14d"
  });
}
