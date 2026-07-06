import { asyncHandler } from "../utils/asyncHandler.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { MessageThread } from "../models/MessageThread.js";
import { broadcastThreadMessage, broadcastDMMessage } from "../services/realtimeService.js";
import { notifyUser } from "../services/notificationService.js";

async function getAuthorizedThread(req, borrowRequestId) {
  const borrowRequest = await BorrowRequest.findById(borrowRequestId).populate("tool", "name");
  if (!borrowRequest) return null;
  const isParticipant = [borrowRequest.borrower.toString(), borrowRequest.owner.toString()].includes(req.user._id.toString());
  const isAdmin = ["admin", "superAdmin"].includes(req.user.role);
  if (!isParticipant && !isAdmin) return false;

  let thread = await MessageThread.findOne({ borrowRequest: borrowRequest._id });
  if (!thread) {
    thread = await MessageThread.create({
      borrowRequest: borrowRequest._id,
      tool: borrowRequest.tool._id,
      community: borrowRequest.community,
      participants: [borrowRequest.borrower, borrowRequest.owner],
      messages: []
    });
  }
  return thread;
}

export const getThread = asyncHandler(async (req, res) => {
  const thread = await getAuthorizedThread(req, req.params.borrowRequestId);
  if (thread === null) return res.status(404).json({ message: "Borrow request not found" });
  if (thread === false) return res.status(403).json({ message: "You can only view messages for your own borrow requests" });
  await thread.populate("participants", "fullName avatarUrl");
  await thread.populate("messages.sender", "fullName avatarUrl");
  res.json({ thread });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const thread = await getAuthorizedThread(req, req.params.borrowRequestId);
  if (thread === null) return res.status(404).json({ message: "Borrow request not found" });
  if (thread === false) return res.status(403).json({ message: "You can only message users on your own borrow requests" });
  thread.messages.push({ sender: req.user._id, body: req.body.body, imageUrl: req.body.imageUrl, readBy: [req.user._id] });
  thread.lastMessageAt = new Date();
  await thread.save();
  const message = thread.messages[thread.messages.length - 1];
  broadcastThreadMessage(req.params.borrowRequestId, {
    _id: message._id,
    body: message.body,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt,
    sender: { _id: req.user._id, fullName: req.user.fullName, avatarUrl: req.user.avatarUrl }
  });
  const recipients = thread.participants.filter((id) => id.toString() !== req.user._id.toString());
  await Promise.all(recipients.map((id) => notifyUser(id, {
    title: "New message",
    message: message.body,
    type: "message",
    data: { borrowRequestId: req.params.borrowRequestId, threadId: thread._id }
  })));
  res.status(201).json({ message });
});

export const createOrGetDMThread = asyncHandler(async (req, res) => {
  const otherId = req.params.userId;
  if (!otherId) return res.status(400).json({ message: "Missing user id" });
  if (otherId === req.user._id.toString()) return res.status(400).json({ message: "Cannot DM yourself" });

  // find an existing DM thread between the two users
  let thread = await MessageThread.findOne({ kind: 'dm', participants: { $size: 2, $all: [req.user._id, otherId] } });
  if (!thread) {
    thread = await MessageThread.create({ kind: 'dm', participants: [req.user._id, otherId], messages: [] });
  }
  await thread.populate('participants', 'fullName avatarUrl');
  res.json({ thread });
});

export const getDMThread = asyncHandler(async (req, res) => {
  const thread = await MessageThread.findById(req.params.threadId).populate('participants', 'fullName avatarUrl').populate('messages.sender', 'fullName avatarUrl');
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  const isParticipant = (thread.participants || []).some((p) => p._id.toString() === req.user._id.toString());
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });
  res.json({ thread });
});

export const sendDM = asyncHandler(async (req, res) => {
  const thread = await MessageThread.findById(req.params.threadId);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  const isParticipant = (thread.participants || []).some((p) => p.toString() === req.user._id.toString());
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });
  thread.messages.push({ sender: req.user._id, body: req.body.body, imageUrl: req.body.imageUrl, readBy: [req.user._id] });
  thread.lastMessageAt = new Date();
  await thread.save();
  const message = thread.messages[thread.messages.length - 1];

  // notify the other participant via user channel
  const other = thread.participants.find((p) => p.toString() !== req.user._id.toString());
  if (other) {
    broadcastDMMessage(other.toString(), {
      threadId: thread._id,
      _id: message._id,
      body: message.body,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
      sender: { _id: req.user._id, fullName: req.user.fullName, avatarUrl: req.user.avatarUrl }
    });
    await notifyUser(other, {
      title: `Message from ${req.user.fullName}`,
      message: message.body,
      type: "message",
      data: { threadId: thread._id }
    });
  }

  res.status(201).json({ message });
});

export const getDMThreads = asyncHandler(async (req, res) => {
  // Find threads where user is a participant — both DM threads and legacy threads without kind
  const threads = await MessageThread.find({
    participants: req.user._id,
    $or: [
      { kind: "dm" },
      { kind: { $exists: false } },
      { borrowRequest: { $exists: false } }
    ]
  })
    .populate("participants", "fullName avatarUrl trustPoints")
    .sort({ lastMessageAt: -1, updatedAt: -1 });
  res.json({ threads });
});

