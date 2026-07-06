import { Router } from "express";
import { login, me, refresh, register, verifyEmail, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validateRegister, validateLogin } from "../validators/authValidator.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh", refresh);
router.get("/me", protect, me);
router.post("/verify-email", protect, verifyEmail);
router.post("/logout", protect, logout);

export default router;
