import { Router } from "express";
import { pool } from "../config/db.js";
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
