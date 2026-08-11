import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listingsRouter = Router();

// Browse — anyone can see active listings, filterable by crop/state/district.
listingsRouter.get("/", asyncHandler(async (req, res) => {
  const { crop, state, district } = req.query;
  const conditions: string[] = ["l.status = 'active'"];
  const values: unknown[] = [];

  if (crop) {
    values.push(`%${crop}%`);
    conditions.push(`l.crop_name ILIKE $${values.length}`);
  }
  if (state) {
    values.push(state);
    conditions.push(`l.state = $${values.length}`);
  }
  if (district) {
    values.push(district);
    conditions.push(`l.district = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT l.*, u.name AS farmer_name, u.village AS farmer_village,
            (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.farmer_id = l.farmer_id) AS farmer_rating,
            (SELECT COUNT(*) FROM reviews r WHERE r.farmer_id = l.farmer_id) AS farmer_rating_count,
            (SELECT COUNT(*) FROM orders o JOIN listings l2 ON l2.id = o.listing_id
              WHERE l2.farmer_id = l.farmer_id AND o.status IN ('delivered', 'paid_out')) AS farmer_completed_orders
     FROM listings l
     JOIN users u ON u.id = l.farmer_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY l.created_at DESC`,
    values
  );
  res.json({ listings: result.rows });
}));

// Distinct state/district pairs among active listings — powers the
// marketplace's location filter dropdowns without hardcoding a state list.
listingsRouter.get("/locations", asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT state, district FROM listings WHERE status = 'active' AND state IS NOT NULL ORDER BY state, district`
  );
  res.json({ locations: result.rows });
}));

listingsRouter.get("/mine", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM listings WHERE farmer_id = $1 ORDER BY created_at DESC`,
    [req.user!.id]
  );
  res.json({ listings: result.rows });
}));

listingsRouter.get("/:id", asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT l.*, u.name AS farmer_name, u.village AS farmer_village, u.phone AS farmer_phone
     FROM listings l JOIN users u ON u.id = l.farmer_id WHERE l.id = $1`,
    [req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Listing not found" });
  res.json({ listing: result.rows[0] });
}));

const createSchema = z.object({
  cropName: z.string().min(1),
  variety: z.string().optional(),
  quantityKg: z.coerce.number().positive(),
  pricePerKg: z.coerce.number().positive(),
  qualityGrade: z.enum(["A", "B", "C"]).default("A"),
  harvestDate: z.string().optional(),
  // Accepts either a real URL or a client-resized data: URI from the photo upload widget.
  photoUrl: z.string().max(400000).optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
});

listingsRouter.post("/", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO listings
       (farmer_id, crop_name, variety, quantity_kg, price_per_kg, quality_grade,
        harvest_date, photo_url, village, district, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      req.user!.id,
      d.cropName,
      d.variety ?? null,
      d.quantityKg,
      d.pricePerKg,
      d.qualityGrade,
      d.harvestDate ?? null,
      d.photoUrl ?? null,
      d.village ?? null,
      d.district ?? null,
      d.state ?? null,
    ]
  );
  res.status(201).json({ listing: result.rows[0] });
}));

const updateSchema = z.object({
  pricePerKg: z.coerce.number().positive().optional(),
  quantityKg: z.coerce.number().positive().optional(),
  status: z.enum(["active", "sold", "expired", "cancelled"]).optional(),
});

listingsRouter.patch("/:id", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const owned = await pool.query("SELECT farmer_id FROM listings WHERE id = $1", [req.params.id]);
  if (!owned.rowCount) return res.status(404).json({ error: "Listing not found" });
  if (owned.rows[0].farmer_id !== req.user!.id) {
    return res.status(403).json({ error: "You don't own this listing" });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of [
    ["pricePerKg", "price_per_kg"],
    ["quantityKg", "quantity_kg"],
    ["status", "status"],
  ] as const) {
    const value = (parsed.data as Record<string, unknown>)[key];
    if (value !== undefined) {
      values.push(value);
      sets.push(`${col} = $${values.length}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: "No fields to update" });
  values.push(req.params.id);

  const result = await pool.query(
    `UPDATE listings SET ${sets.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
    values
  );
  res.json({ listing: result.rows[0] });
}));

listingsRouter.delete("/:id", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const owned = await pool.query("SELECT farmer_id FROM listings WHERE id = $1", [req.params.id]);
  if (!owned.rowCount) return res.status(404).json({ error: "Listing not found" });
  if (owned.rows[0].farmer_id !== req.user!.id) {
    return res.status(403).json({ error: "You don't own this listing" });
  }
  await pool.query("DELETE FROM listings WHERE id = $1", [req.params.id]);
  res.status(204).send();
}));
