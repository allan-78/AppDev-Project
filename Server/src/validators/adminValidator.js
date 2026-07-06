import mongoose from "mongoose";

export const validateUpdateUserStatus = (req, res, next) => {
  const { status } = req.body;
  const errors = [];

  const validStatuses = ["pending", "approved", "suspended", "rejected"];
  if (!status || !validStatuses.includes(status)) {
    errors.push({ msg: `Status must be one of: ${validStatuses.join(", ")}`, path: "status" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};

export const validateBroadcastAnnouncement = (req, res, next) => {
  const { title, message } = req.body;
  const errors = [];

  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push({ msg: "Title is required", path: "title" });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    errors.push({ msg: "Message is required", path: "message" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};
