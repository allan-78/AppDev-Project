import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { BorrowRequest } from "../models/BorrowRequest.js";

const channels = new Map();

function channelName(borrowRequestId) {
  return `borrow:${borrowRequestId}`;
}

export function broadcastThreadMessage(borrowRequestId, payload) {
  const sockets = channels.get(channelName(borrowRequestId));
  if (!sockets) return;
  const message = JSON.stringify({ type: "message", payload });
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
      if (!token || !borrowRequestId) return socket.close();

      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const borrowRequest = await BorrowRequest.findById(borrowRequestId);
      const userId = payload.sub;
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
    } catch (error) {
      socket.close();
    }
  });
}
