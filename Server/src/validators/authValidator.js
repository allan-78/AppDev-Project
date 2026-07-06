export const validateRegister = (req, res, next) => {
  const { fullName, email, password, phone, address, joinCode } = req.body;
  const errors = [];

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    errors.push({ msg: "Full name is required", path: "fullName" });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push({ msg: "Enter a valid email address", path: "email" });
  }
  if (!password || typeof password !== "string" || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/.test(password)) {
    errors.push({ msg: "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol", path: "password" });
  }
  if (!joinCode || typeof joinCode !== "string" || !joinCode.trim()) {
    errors.push({ msg: "Join code is required", path: "joinCode" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push({ msg: "Enter a valid email address", path: "email" });
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    errors.push({ msg: "Password is required", path: "password" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};
