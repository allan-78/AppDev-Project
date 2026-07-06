import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    resourceType: { type: String, enum: ["image", "video"], default: "image" }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    imageUrl: String,
    media: [mediaAssetSchema],
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
