import type { Server, Socket } from "socket.io";

// Clients join a room per order they care about (buyer after checkout, farmer
// on their orders page) and receive live status pushes as the order moves
// through pending -> confirmed -> picked_up -> delivered -> paid_out.
export function registerOrderSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("order:subscribe", (orderId: string) => {
      if (typeof orderId === "string") socket.join(`order:${orderId}`);
    });
    socket.on("order:unsubscribe", (orderId: string) => {
      if (typeof orderId === "string") socket.leave(`order:${orderId}`);
    });
    // Notification bell — one room per logged-in user, joined right after login.
    socket.on("user:subscribe", (userId: string) => {
      if (typeof userId === "string") socket.join(`user:${userId}`);
    });
  });
}
