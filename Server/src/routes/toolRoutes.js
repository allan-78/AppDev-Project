import { Router } from "express";
import { createCategory, createTool, deleteTool, getTool, listCategories, listTools, updateTool } from "../controllers/toolController.js";
import { authorize, protect, requireApprovedResident } from "../middleware/auth.js";
import { validateCreateTool, validateUpdateTool } from "../validators/toolValidator.js";
import { validateMongoId } from "../validators/commonValidator.js";

const router = Router();

router.use(protect);
router.get("/categories", listCategories);
router.post("/categories", authorize("admin", "superAdmin"), createCategory);
router.get("/", listTools);
router.post("/", requireApprovedResident, validateCreateTool, createTool);
router.get("/:id", validateMongoId, getTool);
router.patch("/:id", requireApprovedResident, validateMongoId, validateUpdateTool, updateTool);
router.delete("/:id", authorize("admin", "superAdmin"), validateMongoId, deleteTool);

export default router;
