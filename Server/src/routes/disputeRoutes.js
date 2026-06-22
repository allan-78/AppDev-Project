import { Router } from "express";
import { createDispute, listDisputes, resolveDispute } from "../controllers/disputeController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listDisputes);
router.post("/", createDispute);
router.patch("/:id/resolve", authorize("admin", "superAdmin"), resolveDispute);

export default router;
