import { Router } from "express";
import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const farmersRouter = Router();

const VERIFIED_THRESHOLD = 3;

// Public farmer profile — the trust page a buyer lands on when they click a
// farmer's name from a listing: who they are, their track record, and what
// else they currently have for sale.
farmersRouter.get("/:id", asyncHandler(async (req, res) => {
  const userResult = await pool.query(
    `SELECT id, name, village, district, state, created_at FROM users WHERE id = $1 AND role = 'farmer'`,
    [req.params.id]
  );
  if (!userResult.rowCount) return res.status(404).json({ error: "Farmer not found" });
  const farmer = userResult.rows[0];

  const statsResult = await pool.query(
    `SELECT
       (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE farmer_id = $1) AS rating,
       (SELECT COUNT(*) FROM reviews WHERE farmer_id = $1) AS rating_count,
       (SELECT COUNT(*) FROM orders o JOIN listings l ON l.id = o.listing_id
          WHERE l.farmer_id = $1 AND o.status IN ('delivered', 'paid_out')) AS completed_orders`,
    [req.params.id]
  );
  const stats = statsResult.rows[0];

  const reviewsResult = await pool.query(
    `SELECT r.rating, r.comment, r.created_at, u.name AS buyer_name
     FROM reviews r JOIN users u ON u.id = r.buyer_id
     WHERE r.farmer_id = $1
     ORDER BY r.created_at DESC LIMIT 20`,
    [req.params.id]
  );

  const listingsResult = await pool.query(
    `SELECT id, crop_name, variety, quantity_kg, price_per_kg, quality_grade, photo_url
     FROM listings WHERE farmer_id = $1 AND status = 'active' ORDER BY created_at DESC`,
    [req.params.id]
  );

  res.json({
    farmer,
    rating: stats.rating,
    ratingCount: Number(stats.rating_count),
    completedOrders: Number(stats.completed_orders),
    verified: Number(stats.completed_orders) >= VERIFIED_THRESHOLD,
    reviews: reviewsResult.rows,
    listings: listingsResult.rows,
  });
}));
