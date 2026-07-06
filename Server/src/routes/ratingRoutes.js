import { Router } from "express";
import { submitRating, getUserRatings, getToolRatings } from "../controllers/ratingController.js";
import { protect } from "../middleware/auth.js";
import { validateMongoId } from "../validators/commonValidator.js";

const router = Router();

router.use(protect);

router.post("/", submitRating);
router.get("/user/:userId", (req, res, next) => {
  req.params.id = req.params.userId;
  next();
}, validateMongoId, getUserRatings);

router.get("/tool/:toolId", (req, res, next) => {
  req.params.id = req.params.toolId;
  next();
}, validateMongoId, getToolRatings);

export default router;
