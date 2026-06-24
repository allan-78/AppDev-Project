import { Router } from "express";
import { getThread, sendMessage, createOrGetDMThread, getDMThread, sendDM } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/borrow-requests/:borrowRequestId", getThread);
router.post("/borrow-requests/:borrowRequestId", sendMessage);

// Direct message (DM) endpoints
router.post("/dm/thread/:userId", createOrGetDMThread);
router.get("/dm/:threadId", getDMThread);
router.post("/dm/:threadId", sendDM);

export default router;
