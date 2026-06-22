import { Router } from "express";
import { getThread, sendMessage } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/borrow-requests/:borrowRequestId", getThread);
router.post("/borrow-requests/:borrowRequestId", sendMessage);

export default router;
