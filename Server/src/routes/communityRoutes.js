import { Router } from "express";
import {
  createPost,
  getMine,
  listCommunityRequests,
  listPosts,
  regenerateJoinCode,
  requestCommunity,
  reviewCommunityRequest,
  updateMine
} from "../controllers/communityController.js";
import { authorize, protect, requireApprovedResident } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/mine", getMine);
router.patch("/mine", authorize("admin", "superAdmin"), updateMine);
router.post("/mine/regenerate-code", authorize("admin", "superAdmin"), regenerateJoinCode);
router.get("/posts", listPosts);
router.post("/posts", requireApprovedResident, createPost);
router.get("/requests", listCommunityRequests);
router.post("/requests", requireApprovedResident, requestCommunity);
router.patch("/requests/:id/review", authorize("admin", "superAdmin"), reviewCommunityRequest);

export default router;
