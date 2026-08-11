import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [req.user!.id]
  );
  const unread = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
    [req.user!.id]
  );
  res.json({ notifications: result.rows, unreadCount: Number(unread.rows[0].count) });
}));

notificationsRouter.patch("/:id/read", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user!.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Notification not found" });
  res.json({ notification: result.rows[0] });
}));

notificationsRouter.patch("/read-all", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [req.user!.id]);
  res.json({ ok: true });
}));
