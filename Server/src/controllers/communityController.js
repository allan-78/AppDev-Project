import { asyncHandler } from "../utils/asyncHandler.js";
import { Community } from "../models/Community.js";
import { CommunityPost } from "../models/CommunityPost.js";
import { CommunityRequest } from "../models/CommunityRequest.js";
import { CommunityJoinRequest } from "../models/CommunityJoinRequest.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { adjustTrustPoints } from "../services/trustService.js";
import { audit } from "../services/auditService.js";

const COMMUNITY_CREATION_COST = 50;

function makeJoinCode(name) {
  const prefix = String(name || "COMM").replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "COMM";
  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export const getMine = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.user.community).populate("createdBy", "fullName");
  res.json({ community });
});

export const updateMine = asyncHandler(async (req, res) => {
  const community = await Community.findByIdAndUpdate(req.user.community, req.body, { new: true });
  res.json({ community });
});

export const regenerateJoinCode = asyncHandler(async (req, res) => {
  const community = await Community.findByIdAndUpdate(req.user.community, { joinCode: makeJoinCode("join") }, { new: true });
  res.json({ community });
});

export const listPosts = asyncHandler(async (req, res) => {
  const posts = await CommunityPost.find({ community: req.user.community })
    .populate("author", "fullName avatarUrl trustPoints")
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ posts });
});

export const createPost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.create({
    community: req.user.community,
    author: req.user._id,
    title: req.body.title,
    body: req.body.body,
    imageUrl: req.body.imageUrl,
    tags: req.body.tags || []
  });
  await audit(req.user, "community.post", "CommunityPost", post._id, { title: post.title });
  res.status(201).json({ post: await post.populate("author", "fullName avatarUrl trustPoints") });
});

export const listCommunityRequests = asyncHandler(async (req, res) => {
  const query = ["admin", "superAdmin"].includes(req.user.role)
    ? { $or: [{ sourceCommunity: req.user.community }, { status: "pending" }] }
    : { requestedBy: req.user._id };
  const requests = await CommunityRequest.find(query)
    .populate("requestedBy", "fullName email trustPoints")
    .populate("approvedCommunity", "name joinCode")
    .sort({ createdAt: -1 });
  res.json({ requests });
});

export const requestCommunity = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.trustPoints < COMMUNITY_CREATION_COST) {
    return res.status(400).json({ message: `Creating a community requires at least ${COMMUNITY_CREATION_COST} trust points.` });
  }

  const request = await CommunityRequest.create({
    name: req.body.name,
    type: req.body.type,
    location: req.body.location,
    description: req.body.description,
    requestedBy: req.user._id,
    sourceCommunity: req.user.community,
    trustPointCost: COMMUNITY_CREATION_COST
  });
  await audit(req.user, "community.request", "CommunityRequest", request._id, { name: request.name });
  res.status(201).json({ request });
});

export const submitJoinRequest = asyncHandler(async (req, res) => {
  const joinCode = String(req.body.joinCode || "").toUpperCase();
  const community = await Community.findOne({ joinCode });
  if (!community) return res.status(400).json({ message: "Invalid join code" });

  // require ID and answers
  if (!req.body.idImageUrl) return res.status(400).json({ message: "idImageUrl is required to join a community" });
  const answers = req.body.answers || {};

  const existing = await CommunityJoinRequest.findOne({ community: community._id, applicant: req.user._id });
  if (existing && existing.status === "pending") return res.status(400).json({ message: "You already have a pending join request" });

  const jr = await CommunityJoinRequest.create({ community: community._id, applicant: req.user._id, idImageUrl: req.body.idImageUrl, answers });
  await audit(req.user, "community.join.request", "CommunityJoinRequest", jr._id, { community: community.name });
  const note = await Notification.create({ user: req.user._id, title: "Join request submitted", message: `Your request to join ${community.name} is pending admin review.` });
  try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(req.user._id), { id: note._id, title: note.title, message: note.message }); } catch (e) { }
  res.status(201).json({ request: jr });
});

export const listJoinRequests = asyncHandler(async (req, res) => {
  const query = ["admin", "superAdmin"].includes(req.user.role) ? {} : { applicant: req.user._id };
  const list = await CommunityJoinRequest.find(query).populate("applicant", "fullName email trustPoints").populate("community", "name").sort({ createdAt: -1 });
  res.json({ requests: list });
});

export const reviewJoinRequest = asyncHandler(async (req, res) => {
  const jr = await CommunityJoinRequest.findById(req.params.id).populate("community");
  if (!jr) return res.status(404).json({ message: "Join request not found" });
  const decision = req.body.decision;
  jr.status = decision === "approved" ? "approved" : "rejected";
  jr.reviewedBy = req.user._id;
  jr.reviewedAt = new Date();
  jr.adminNote = req.body.adminNote;
  await jr.save();

  if (decision === "approved") {
    // attach user to community and set approved
    await User.findByIdAndUpdate(jr.applicant, { community: jr.community._id, status: "approved" });
    await audit(req.user, "community.join.approved", "CommunityJoinRequest", jr._id, { community: jr.community.name });
    const note = await Notification.create({ user: jr.applicant, title: "Join request approved", message: `Your join request for ${jr.community.name} was approved.` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(jr.applicant), { id: note._id, title: note.title, message: note.message }); } catch (e) { }
  }

  if (decision === "rejected") {
    const note = await Notification.create({ user: jr.applicant, title: "Join request rejected", message: `Your join request for ${jr.community.name} was rejected.` });
    try { const { broadcastNotification } = await import("../services/realtimeService.js"); broadcastNotification(String(jr.applicant), { id: note._id, title: note.title, message: note.message }); } catch (e) { }
  }

  res.json({ request: jr });
});

export const reviewCommunityRequest = asyncHandler(async (req, res) => {
  const request = await CommunityRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Community request not found" });
  if (request.status !== "pending") return res.status(400).json({ message: "Community request has already been reviewed" });

  const decision = req.body.decision;
  request.status = decision === "approved" ? "approved" : "rejected";
  request.adminNote = req.body.adminNote;
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();

  if (decision === "approved") {
    const community = await Community.create({
      name: request.name,
      location: request.location,
      type: request.type,
      description: request.description,
      joinCode: makeJoinCode(request.name),
      createdBy: request.requestedBy
    });
    await adjustTrustPoints({
      userId: request.requestedBy,
      community: request.sourceCommunity,
      amount: -request.trustPointCost,
      type: "community_creation_fee",
      reason: `Community creation fee for ${community.name}`
    });
    request.approvedCommunity = community._id;
  }

  await request.save();
  await audit(req.user, "community.review", "CommunityRequest", request._id, { status: request.status });
  res.json({ request });
});
