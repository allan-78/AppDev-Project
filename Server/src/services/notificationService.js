import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { broadcastNotification } from "./realtimeService.js";

async function sendExpoPush(tokens, title, message, data = {}) {
  const validTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!validTokens.length || typeof fetch !== "function") return;

  const chunks = [];
  for (let i = 0; i < validTokens.length; i += 100) chunks.push(validTokens.slice(i, i + 100));

  await Promise.all(chunks.map((chunk) => fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(chunk.map((to) => ({ to, title, body: message, data })))
  }).catch(() => null)));
}

export async function notifyUser(userId, { title, message, type = "system", data = {} }) {
  const notification = await Notification.create({ user: userId, title, message, type });
  broadcastNotification(String(userId), {
    id: notification._id,
    title,
    message,
    type,
    data,
    createdAt: notification.createdAt
  });

  const user = await User.findById(userId).select("pushTokens");
  const tokens = (user?.pushTokens || []).map((item) => item.token);
  await sendExpoPush(tokens, title, message, { notificationId: String(notification._id), type, ...data });
  return notification;
}

export async function notifyUsers(userIds, payload) {
  const uniqueIds = [...new Set((userIds || []).map(String))];
  return Promise.all(uniqueIds.map((id) => notifyUser(id, payload)));
}
