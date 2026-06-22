import { Router } from "express";
import { createCategory, createTool, deleteTool, getTool, listCategories, listTools, updateTool } from "../controllers/toolController.js";
import { authorize, protect, requireApprovedResident } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/categories", listCategories);
router.post("/categories", authorize("admin", "superAdmin"), createCategory);
router.get("/", listTools);
router.post("/", requireApprovedResident, createTool);
router.get("/:id", getTool);
router.patch("/:id", requireApprovedResident, updateTool);
router.delete("/:id", authorize("admin", "superAdmin"), deleteTool);

export default router;
