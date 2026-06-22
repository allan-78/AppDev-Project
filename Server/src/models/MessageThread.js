import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    imageUrl: String,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

const messageThreadSchema = new mongoose.Schema(
  {
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest", required: true, unique: true },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    messages: [messageSchema],
    lastMessageAt: Date
  },
  { timestamps: true }
);

export const MessageThread = mongoose.model("MessageThread", messageThreadSchema);
