import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const farmerRouter = Router();

// Shows a farmer what they actually earned per sale next to that day's mandi
// modal price for the same crop, so the direct-sale benefit is visible, not assumed.
farmerRouter.get("/dashboard", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const salesResult = await pool.query(
    `SELECT o.id AS order_id, o.quantity_kg, o.unit_price, o.total_price, o.status,
            o.created_at, l.crop_name
     FROM orders o
     JOIN listings l ON l.id = o.listing_id
     WHERE l.farmer_id = $1
     ORDER BY o.created_at DESC`,
    [req.user!.id]
  );

  const sales = [];
  for (const sale of salesResult.rows) {
    const mandiRow = await pool.query(
      `SELECT AVG(modal_price)::numeric(10,2) AS avg_modal_price
       FROM (
         SELECT modal_price FROM mandi_prices
         WHERE crop_name ILIKE $1 AND price_date <= $2::date
         ORDER BY price_date DESC LIMIT 20
       ) recent`,
      [sale.crop_name, sale.created_at]
    );
    const modalPerQuintal = mandiRow.rows[0]?.avg_modal_price ?? null;
    const modalPerKg = modalPerQuintal ? Number(modalPerQuintal) / 100 : null;
    sales.push({
      ...sale,
      mandi_price_per_kg: modalPerKg,
      earned_vs_mandi_pct: modalPerKg ? Number((((sale.unit_price - modalPerKg) / modalPerKg) * 100).toFixed(1)) : null,
    });
  }

  const totalsResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE o.status != 'cancelled') AS total_orders,
       COALESCE(SUM(o.total_price) FILTER (WHERE o.status != 'cancelled'), 0) AS total_earned,
       COALESCE(SUM(o.quantity_kg) FILTER (WHERE o.status != 'cancelled'), 0) AS total_kg_sold
     FROM orders o JOIN listings l ON l.id = o.listing_id
     WHERE l.farmer_id = $1`,
    [req.user!.id]
  );

  const activeListingsResult = await pool.query(
    `SELECT COUNT(*) AS active_listings FROM listings WHERE farmer_id = $1 AND status = 'active'`,
    [req.user!.id]
  );

  res.json({
    totals: totalsResult.rows[0],
    activeListings: Number(activeListingsResult.rows[0].active_listings),
    sales,
  });
}));
