import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mandiPricesRouter = Router();

// Latest price per crop/mandi combination — the "price board" a farmer checks
// before deciding what to ask for their harvest.
mandiPricesRouter.get("/", asyncHandler(async (req, res) => {
  const { crop, state, district } = req.query;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (crop) {
    values.push(`%${crop}%`);
    conditions.push(`crop_name ILIKE $${values.length}`);
  }
  if (state) {
    values.push(state);
    conditions.push(`state = $${values.length}`);
  }
  if (district) {
    values.push(district);
    conditions.push(`district = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT DISTINCT ON (crop_name, mandi_name) *
     FROM mandi_prices
     ${where}
     ORDER BY crop_name, mandi_name, price_date DESC`,
    values
  );
  res.json({ prices: result.rows });
}));

mandiPricesRouter.get("/crops", asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT crop_name FROM mandi_prices ORDER BY crop_name`
  );
  res.json({ crops: result.rows.map((r) => r.crop_name) });
}));

mandiPricesRouter.get("/states", asyncHandler(async (_req, res) => {
  const result = await pool.query(`SELECT DISTINCT state FROM mandi_prices ORDER BY state`);
  res.json({ states: result.rows.map((r) => r.state) });
}));

// Recent trend for one crop, used on the farmer dashboard to compare their
// sale price against what the mandi was actually paying that week.
mandiPricesRouter.get("/trend", asyncHandler(async (req, res) => {
  const { crop } = req.query;
  if (!crop) return res.status(400).json({ error: "crop query param is required" });

  const result = await pool.query(
    `SELECT price_date, AVG(modal_price)::numeric(10,2) AS avg_modal_price
     FROM mandi_prices
     WHERE crop_name ILIKE $1 AND price_date >= CURRENT_DATE - INTERVAL '14 days'
     GROUP BY price_date
     ORDER BY price_date ASC`,
    [crop]
  );
  res.json({ trend: result.rows });
}));

// Crop watchlist — lets a user get notified when a crop's price moves
// sharply instead of having to keep re-checking the price board.
mandiPricesRouter.get("/watch", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `SELECT crop_name, created_at FROM price_watches WHERE user_id = $1 ORDER BY crop_name`,
    [req.user!.id]
  );
  res.json({ watches: result.rows });
}));

const watchSchema = z.object({ cropName: z.string().min(1) });

mandiPricesRouter.post("/watch", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = watchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await pool.query(
    `INSERT INTO price_watches (user_id, crop_name) VALUES ($1, $2)
     ON CONFLICT (user_id, crop_name) DO NOTHING`,
    [req.user!.id, parsed.data.cropName]
  );
  res.status(201).json({ ok: true });
}));

mandiPricesRouter.delete("/watch/:cropName", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  await pool.query(
    `DELETE FROM price_watches WHERE user_id = $1 AND crop_name = $2`,
    [req.user!.id, req.params.cropName]
  );
  res.status(204).send();
}));
