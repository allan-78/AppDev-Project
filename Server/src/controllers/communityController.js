import { asyncHandler } from "../utils/asyncHandler.js";
import { Community } from "../models/Community.js";
import { CommunityPost } from "../models/CommunityPost.js";
import { CommunityRequest } from "../models/CommunityRequest.js";
import { CommunityJoinRequest } from "../models/CommunityJoinRequest.js";
import { User } from "../models/User.js";
import { CommunityMembership } from "../models/CommunityMembership.js";
import { adjustTrustPoints } from "../services/trustService.js";
import { audit } from "../services/auditService.js";
import { notifyUser } from "../services/notificationService.js";

// Utility to escape special regex characters to prevent NoSQL injection
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMMUNITY_CREATION_COST = 50;

function makeJoinCode(name) {
  const prefix = String(name || "COMM").replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "COMM";
  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function mediaFromBody(body, legacyKey) {
  if (body.media) return body.media;
  if (body.idMedia) return body.idMedia;
  if (body.residentIdMedia) return body.residentIdMedia;
  if (body[legacyKey]) return { url: body[legacyKey], resourceType: "image" };
  return undefined;
}

async function activeCommunityIdsFor(user) {
  const memberships = await CommunityMembership.find({ user: user._id, status: "active" }).select("community");
  const ids = memberships.map((item) => item.community);
  if (!ids.length && user.community) ids.push(user.community);
  return ids;
}

async function ensureMembership({ userId, communityId, role = "member", isDefault = false }) {
  return CommunityMembership.findOneAndUpdate(
    { user: userId, community: communityId },
    { $set: { role, status: "active", isDefault, joinedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export const getMine = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.user.community).populate("createdBy", "fullName");
  const memberships = await CommunityMembership.find({ user: req.user._id, status: "active" })
    .populate("community", "name location type description joinCode isDefault status")
    .sort({ isDefault: -1, joinedAt: -1 });
  res.json({ community, memberships });
});

export const updateMine = asyncHandler(async (req, res) => {
  // FIX: Whitelist allowed fields instead of passing raw req.body
  const allowedFields = ['name', 'description', 'location', 'type', 'trustRules'];
  const updates = {};
  allowedFields.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
  const community = await Community.findByIdAndUpdate(req.user.community, updates, { new: true });
  res.json({ community });
});

export const regenerateJoinCode = asyncHandler(async (req, res) => {
  const community = await Community.findByIdAndUpdate(req.user.community, { joinCode: makeJoinCode("join") }, { new: true });
  res.json({ community });
});

export const listPosts = asyncHandler(async (req, res) => {
  const communityIds = await activeCommunityIdsFor(req.user);
  const query = req.query.community ? { community: req.query.community } : { community: { $in: communityIds } };
  const posts = await CommunityPost.find(query)
    .populate("community", "name description location type")
    .populate("author", "fullName avatarUrl trustPoints")
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ posts });
});

export const feed = asyncHandler(async (req, res) => {
  let communityIds = await activeCommunityIdsFor(req.user);
  if (!communityIds.length) {
    const defaultComm = await Community.findOne({ isDefault: true });
    if (defaultComm) {
      communityIds = [defaultComm._id];
    }
  }
  const query = communityIds.length
    ? { community: { $in: communityIds } }
    : { visibility: "public" };
  const posts = await CommunityPost.find(query)
    .populate("community", "name description location type")
    .populate("author", "fullName avatarUrl trustPoints")
    .sort({ createdAt: -1 })
    .limit(75);
  res.json({ posts });
});


export const discover = asyncHandler(async (req, res) => {
  const query = { status: "active" };
  if (req.query.search) {
    // FIX: Escape regex special characters to prevent NoSQL injection
    const safeSearch = escapeRegex(req.query.search);
    query.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } }
    ];
  }
  const communities = await Community.find(query).sort({ isDefault: -1, name: 1 }).limit(80);
  const memberships = await CommunityMembership.find({ user: req.user._id, community: { $in: communities.map((c) => c._id) } });
  const statusByCommunity = new Map(memberships.map((m) => [String(m.community), m.status]));
  res.json({
    communities: communities.map((community) => ({
      ...community.toObject(),
      membershipStatus: statusByCommunity.get(String(community._id)) || null
    }))
  });
});

export const getCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id).populate("createdBy", "fullName avatarUrl trustPoints");
  if (!community) return res.status(404).json({ message: "Community not found" });
  const [membership, activeCount, recentPosts] = await Promise.all([
    CommunityMembership.findOne({ community: community._id, user: req.user._id }),
    CommunityMembership.countDocuments({ community: community._id, status: "active" }),
    CommunityPost.find({ community: community._id }).populate("author", "fullName avatarUrl").sort({ createdAt: -1 }).limit(5)
  ]);
  res.json({ community, membership, activeCount, recentPosts });
});

export const createPost = asyncHandler(async (req, res) => {
  const community = req.body.community || req.user.community;
  const membership = await CommunityMembership.findOne({ user: req.user._id, community, status: "active" });
  if (!membership && String(community) !== String(req.user.community)) {
    return res.status(403).json({ message: "Join this community before posting" });
  }
  const post = await CommunityPost.create({
    community,
    author: req.user._id,
    title: req.body.title,
    body: req.body.body,
    imageUrl: req.body.imageUrl,
    media: req.body.media || (req.body.imageUrl ? [{ url: req.body.imageUrl, resourceType: "image" }] : []),
    tags: req.body.tags || []
  });
  await audit(req.user, "community.post", "CommunityPost", post._id, { title: post.title });
  await post.populate("community", "name description location type");
  await post.populate("author", "fullName avatarUrl trustPoints");
  res.status(201).json({ post });
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
    return res.status(400).json({ message: `Creating a community requires at least ${COMMUNITY_CREATION_COST} trust points. You have ${user.trustPoints}.` });
  }
  const residentIdMedia = mediaFromBody(req.body, "residentIdImageUrl");
  if (!residentIdMedia?.url) return res.status(400).json({ message: "Resident ID media is required to request a community" });

  const request = await CommunityRequest.create({
    name: req.body.name,
    type: req.body.type,
    location: req.body.location,
    description: req.body.description,
    residentIdMedia,
    requestedBy: req.user._id,
    sourceCommunity: req.user.community,
  });
  await audit(req.user, "community.request", "CommunityRequest", request._id, { name: request.name });
  res.status(201).json({ request });
});

export const submitJoinRequest = asyncHandler(async (req, res) => {
  const joinCode = String(req.body.joinCode || "").toUpperCase();
  const community = req.params.id ? await Community.findById(req.params.id) : await Community.findOne({ joinCode });
  if (!community) return res.status(400).json({ message: "Invalid join code" });

  // require ID and answers
  const idMedia = mediaFromBody(req.body, "idImageUrl");
  if (!idMedia?.url) return res.status(400).json({ message: "Valid ID media is required to join a community" });
  const answers = req.body.answers || {};

  const existing = await CommunityJoinRequest.findOne({ community: community._id, applicant: req.user._id });
  if (existing && existing.status === "pending") return res.status(400).json({ message: "You already have a pending join request" });

  const jr = await CommunityJoinRequest.create({ community: community._id, applicant: req.user._id, idImageUrl: idMedia.url, idMedia, answers });
  await audit(req.user, "community.join.request", "CommunityJoinRequest", jr._id, { community: community.name });
  await notifyUser(req.user._id, { title: "Join request submitted", message: `Your request to join ${community.name} is pending admin review.`, type: "community" });
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
    const user = await User.findById(jr.applicant);
    await ensureMembership({ userId: jr.applicant, communityId: jr.community._id, isDefault: !user?.community });
    if (!user?.community) await User.findByIdAndUpdate(jr.applicant, { community: jr.community._id, status: "approved" });
    await audit(req.user, "community.join.approved", "CommunityJoinRequest", jr._id, { community: jr.community.name });
    await notifyUser(jr.applicant, { title: "Join request approved", message: `Your join request for ${jr.community.name} was approved.`, type: "community" });
  }

  if (decision === "rejected") {
    await notifyUser(jr.applicant, { title: "Join request rejected", message: `Your join request for ${jr.community.name} was rejected.`, type: "community" });
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
    await ensureMembership({ userId: request.requestedBy, communityId: community._id, role: "creator" });
    request.approvedCommunity = community._id;
  }

  await request.save();
  await audit(req.user, "community.review", "CommunityRequest", request._id, { status: request.status });
  res.json({ request });
});

export const upvotePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const userId = req.user._id;
  // Remove downvote if present
  post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());

  const hasUpvoted = post.upvotes.some(id => id.toString() === userId.toString());
  if (hasUpvoted) {
    // toggle off upvote
    post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());
  } else {
    post.upvotes.push(userId);
  }

  await post.save();
  res.json({ 
    upvotesCount: post.upvotes.length, 
    downvotesCount: post.downvotes.length, 
    hasUpvoted: !hasUpvoted,
    hasDownvoted: false
  });
});

export const downvotePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const userId = req.user._id;
  // Remove upvote if present
  post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());

  const hasDownvoted = post.downvotes.some(id => id.toString() === userId.toString());
  if (hasDownvoted) {
    // toggle off downvote
    post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());
  } else {
    post.downvotes.push(userId);
  }

  await post.save();
  res.json({ 
    upvotesCount: post.upvotes.length, 
    downvotesCount: post.downvotes.length, 
    hasUpvoted: false,
    hasDownvoted: !hasDownvoted
  });
});

export const commentPost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const { body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ message: "Comment body is required" });
  }

  const comment = {
    author: req.user._id,
    authorName: req.user.fullName,
    body: body.trim(),
    createdAt: new Date()
  };

  post.comments.push(comment);
  await post.save();

  res.status(201).json({ comment: post.comments[post.comments.length - 1] });
});

