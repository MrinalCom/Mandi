import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const wishlistRouter = Router();

wishlistRouter.get("/", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `SELECT w.id AS wishlist_id, w.listing_id, l.crop_name, l.variety, l.quantity_kg, l.price_per_kg,
            l.quality_grade, l.status, l.photo_url, u.name AS farmer_name
     FROM wishlist_items w
     JOIN listings l ON l.id = w.listing_id
     JOIN users u ON u.id = l.farmer_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [req.user!.id]
  );
  res.json({ items: result.rows });
}));

const addSchema = z.object({ listingId: z.string().uuid() });

wishlistRouter.post("/", requireAuth, requireRole("buyer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await pool.query(
    `INSERT INTO wishlist_items (user_id, listing_id) VALUES ($1, $2)
     ON CONFLICT (user_id, listing_id) DO NOTHING`,
    [req.user!.id, parsed.data.listingId]
  );
  res.status(201).json({ ok: true });
}));

wishlistRouter.delete("/:listingId", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  await pool.query(
    `DELETE FROM wishlist_items WHERE user_id = $1 AND listing_id = $2`,
    [req.user!.id, req.params.listingId]
  );
  res.status(204).send();
}));
