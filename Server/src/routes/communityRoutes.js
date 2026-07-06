import { Router } from "express";
import * as communityController from "../controllers/communityController.js";
import { authorize, protect, requireApprovedResident } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/mine", communityController.getMine);
router.patch("/mine", authorize("admin", "superAdmin"), communityController.updateMine);
router.post("/mine/regenerate-code", authorize("admin", "superAdmin"), communityController.regenerateJoinCode);
router.get("/discover", communityController.discover);
router.get("/feed", communityController.feed);
router.get("/posts", communityController.listPosts);
router.post("/posts", requireApprovedResident, communityController.createPost);
router.get("/requests", communityController.listCommunityRequests);
router.post("/requests", requireApprovedResident, communityController.requestCommunity);
router.patch("/requests/:id/review", authorize("admin", "superAdmin"), communityController.reviewCommunityRequest);
router.post("/join-requests", requireApprovedResident, communityController.submitJoinRequest);
router.get("/join-requests", communityController.listJoinRequests);
router.patch("/join-requests/:id/review", authorize("admin", "superAdmin"), communityController.reviewJoinRequest);
router.get("/:id", communityController.getCommunity);
router.post("/:id/join-request", requireApprovedResident, communityController.submitJoinRequest);
router.post("/posts/:id/upvote", requireApprovedResident, communityController.upvotePost);
router.post("/posts/:id/downvote", requireApprovedResident, communityController.downvotePost);
router.post("/posts/:id/comment", requireApprovedResident, communityController.commentPost);

export default router;
