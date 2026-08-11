import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notify } from "../services/notifications.js";

export const poolsRouter = Router();

// Pool groups let several small farmers combine listings of the same crop in
// the same mandi zone into one lot big enough for a bulk buyer's minimum order.
poolsRouter.get("/", asyncHandler(async (req, res) => {
  const { status = "open" } = req.query;
  const result = await pool.query(
    `SELECT p.*, u.name AS created_by_name
     FROM pool_groups p JOIN users u ON u.id = p.created_by
     WHERE p.status = $1
     ORDER BY p.created_at DESC`,
    [status]
  );
  res.json({ pools: result.rows });
}));

poolsRouter.get("/:id", asyncHandler(async (req, res) => {
  const poolResult = await pool.query(
    `SELECT p.*, u.name AS created_by_name FROM pool_groups p JOIN users u ON u.id = p.created_by WHERE p.id = $1`,
    [req.params.id]
  );
  if (!poolResult.rowCount) return res.status(404).json({ error: "Pool not found" });

  const contributions = await pool.query(
    `SELECT pc.id, pc.quantity_kg, pc.created_at, u.name AS farmer_name, u.village AS farmer_village
     FROM pool_contributions pc JOIN users u ON u.id = pc.farmer_id
     WHERE pc.pool_group_id = $1 ORDER BY pc.created_at ASC`,
    [req.params.id]
  );
  res.json({ pool: poolResult.rows[0], contributions: contributions.rows });
}));

const createSchema = z.object({
  cropName: z.string().min(1),
  mandiZone: z.string().min(1),
  pricePerKg: z.coerce.number().positive(),
  targetQuantityKg: z.coerce.number().positive(),
});

poolsRouter.post("/", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const result = await pool.query(
    `INSERT INTO pool_groups (crop_name, mandi_zone, price_per_kg, target_quantity_kg, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [d.cropName, d.mandiZone, d.pricePerKg, d.targetQuantityKg, req.user!.id]
  );
  res.status(201).json({ pool: result.rows[0] });
}));

const joinSchema = z.object({
  quantityKg: z.coerce.number().positive(),
  listingId: z.string().uuid().optional(),
});

poolsRouter.post("/:id/join", requireAuth, requireRole("farmer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { quantityKg, listingId } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poolRow = await client.query("SELECT * FROM pool_groups WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (!poolRow.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pool not found" });
    }
    const current = poolRow.rows[0];
    if (current.status !== "open") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This pool is no longer open" });
    }

    await client.query(
      `INSERT INTO pool_contributions (pool_group_id, farmer_id, listing_id, quantity_kg)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, req.user!.id, listingId ?? null, quantityKg]
    );

    if (listingId) {
      await client.query(
        `UPDATE listings SET status = 'pooled', pool_group_id = $1 WHERE id = $2 AND farmer_id = $3`,
        [req.params.id, listingId, req.user!.id]
      );
    }

    const newTotal = Number(current.current_quantity_kg) + quantityKg;
    const newStatus = newTotal >= Number(current.target_quantity_kg) ? "filled" : "open";
    const updated = await client.query(
      `UPDATE pool_groups SET current_quantity_kg = $1, status = $2 WHERE id = $3 RETURNING *`,
      [newTotal, newStatus, req.params.id]
    );

    await client.query("COMMIT");

    if (newStatus === "filled") {
      const contributors = await pool.query(
        `SELECT DISTINCT farmer_id FROM pool_contributions WHERE pool_group_id = $1`,
        [req.params.id]
      );
      const io = req.app.get("io") as Server;
      for (const row of contributors.rows) {
        await notify(
          io,
          row.farmer_id,
          "pool_filled",
          `Your ${current.crop_name} pool in ${current.mandi_zone} is full and ready for a buyer`,
          "/pools"
        );
      }
    }

    res.json({ pool: updated.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}));
