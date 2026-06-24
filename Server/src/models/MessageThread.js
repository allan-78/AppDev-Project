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
    // borrowRequest is optional now; DM threads will omit this
    borrowRequest: { type: mongoose.Schema.Types.ObjectId, ref: "BorrowRequest" },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: "Tool" },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    // kind: 'borrow' for borrow-scoped threads, 'dm' for direct messages
    kind: { type: String, enum: ["borrow", "dm"], default: "borrow" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    messages: [messageSchema],
    lastMessageAt: Date
  },
  { timestamps: true }
);

// index to quickly find DM threads between two users
messageThreadSchema.index({ kind: 1, participants: 1 });

export const MessageThread = mongoose.model("MessageThread", messageThreadSchema);
