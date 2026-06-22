import { asyncHandler } from "../utils/asyncHandler.js";
import { BorrowRequest } from "../models/BorrowRequest.js";
import { MessageThread } from "../models/MessageThread.js";
import { broadcastThreadMessage } from "../services/realtimeService.js";

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
  res.status(201).json({ message });
});
