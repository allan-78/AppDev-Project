import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { BorrowRequest } from "../models/BorrowRequest.js";

const channels = new Map();

function channelName(borrowRequestId) {
  return `borrow:${borrowRequestId}`;
}

function userChannelName(userId) {
  return `user:${userId}`;
}

export function broadcastThreadMessage(borrowRequestId, payload) {
  const sockets = channels.get(channelName(borrowRequestId));
  if (!sockets) return;
  const message = JSON.stringify({ type: "message", payload });
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}

export function broadcastNotification(userId, payload) {
  const sockets = channels.get(userChannelName(userId));
  if (!sockets) return;
  const message = JSON.stringify({ type: "notification", payload });
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}

export function broadcastDMMessage(userId, payload) {
  const sockets = channels.get(userChannelName(userId));
  if (!sockets) return;
  const message = JSON.stringify({ type: "dm", payload });
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}

export function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (socket, req) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const token = url.searchParams.get("token");
      const borrowRequestId = url.searchParams.get("borrowRequest");
      if (!token) return socket.close();

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = payload.sub;

      if (borrowRequestId) {
        // subscribe to a borrow thread (existing behavior)
        const borrowRequest = await BorrowRequest.findById(borrowRequestId);
        const canJoin = borrowRequest && [borrowRequest.borrower.toString(), borrowRequest.owner.toString()].includes(userId);
        if (!canJoin) return socket.close();
        const name = channelName(borrowRequestId);
        const sockets = channels.get(name) || new Set();
        sockets.add(socket);
        channels.set(name, sockets);

        socket.on("close", () => {
          sockets.delete(socket);
          if (!sockets.size) channels.delete(name);
        });
        return;
      }

      // subscribe to user notifications
      const uname = userChannelName(userId);
      const usockets = channels.get(uname) || new Set();
      usockets.add(socket);
      channels.set(uname, usockets);

      socket.on("close", () => {
        usockets.delete(socket);
        if (!usockets.size) channels.delete(uname);
      });
    } catch (error) {
      socket.close();
    }
  });
}

export function attachUserChannel(wss) {
  // kept for compatibility in case callers want a separate entrypoint
}
