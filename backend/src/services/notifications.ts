import type { Server } from "socket.io";
import { pool } from "../config/db.js";

// Creates a notification row and pushes it live over the user's socket room
// (joined client-side as `user:<id>` right after login) so the bell in the
// nav updates without a page refresh.
export async function notify(
  io: Server,
  userId: string,
  type: string,
  message: string,
  link?: string
) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, type, message, link ?? null]
  );
  const notification = result.rows[0];
  io.to(`user:${userId}`).emit("notification:new", notification);
  return notification;
}
