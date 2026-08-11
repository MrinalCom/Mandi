import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import { pool } from "../config/db.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notify } from "../services/notifications.js";

export const ordersRouter = Router();

const createSchema = z.object({
  listingId: z.string().uuid(),
  quantityKg: z.coerce.number().positive(),
  pickupNote: z.string().optional(),
});

// Buyer commits to a listing before harvest is necessarily cut, replacing the
// "sell to whoever shows up at the mandi that morning" pattern.
ordersRouter.post("/", requireAuth, requireRole("buyer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { listingId, quantityKg, pickupNote } = parsed.data;

  const client = await pool.connect();
  let order;
  let listing;
  try {
    await client.query("BEGIN");

    const listingRow = await client.query("SELECT * FROM listings WHERE id = $1 FOR UPDATE", [listingId]);
    if (!listingRow.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Listing not found" });
    }
    listing = listingRow.rows[0];
    if (listing.status !== "active") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Listing is no longer available" });
    }
    if (quantityKg > Number(listing.quantity_kg)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Not enough quantity available" });
    }

    const unitPrice = Number(listing.price_per_kg);
    const totalPrice = Number((unitPrice * quantityKg).toFixed(2));

    const orderResult = await client.query(
      `INSERT INTO orders (buyer_id, listing_id, quantity_kg, unit_price, total_price, pickup_note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user!.id, listingId, quantityKg, unitPrice, totalPrice, pickupNote ?? null]
    );
    order = orderResult.rows[0];

    await client.query(
      `INSERT INTO order_events (order_id, status, note) VALUES ($1, 'pending', 'Order placed')`,
      [order.id]
    );

    const remaining = Number(listing.quantity_kg) - quantityKg;
    if (remaining <= 0) {
      await client.query(`UPDATE listings SET status = 'sold', quantity_kg = 0 WHERE id = $1`, [listingId]);
    } else {
      await client.query(`UPDATE listings SET quantity_kg = $1 WHERE id = $2`, [remaining, listingId]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const io = req.app.get("io") as Server;
  await notify(
    io,
    listing.farmer_id,
    "new_order",
    `New order: ${quantityKg}kg of ${listing.crop_name} at ₹${listing.price_per_kg}/kg`,
    "/orders"
  );

  res.status(201).json({ order });
}));

ordersRouter.get("/mine", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const isFarmer = req.user!.role === "farmer";
  const result = await pool.query(
    isFarmer
      ? `SELECT o.*, l.crop_name, u.name AS buyer_name
         FROM orders o
         JOIN listings l ON l.id = o.listing_id
         JOIN users u ON u.id = o.buyer_id
         WHERE l.farmer_id = $1
         ORDER BY o.created_at DESC`
      : `SELECT o.*, l.crop_name, u.name AS farmer_name,
                EXISTS(SELECT 1 FROM reviews r WHERE r.order_id = o.id) AS has_review
         FROM orders o
         JOIN listings l ON l.id = o.listing_id
         JOIN users u ON u.id = l.farmer_id
         WHERE o.buyer_id = $1
         ORDER BY o.created_at DESC`,
    [req.user!.id]
  );
  res.json({ orders: result.rows });
}));

ordersRouter.get("/:id/events", requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ events: result.rows });
}));

const statusSchema = z.object({
  status: z.enum(["confirmed", "picked_up", "delivered", "paid_out", "cancelled"]),
  note: z.string().optional(),
});

const STATUS_MESSAGE: Record<string, string> = {
  confirmed: "Your order was confirmed by the farmer",
  picked_up: "Your order has been picked up",
  delivered: "Order marked delivered — payment released",
  paid_out: "Payment has been settled",
  cancelled: "An order was cancelled",
};

ordersRouter.patch("/:id/status", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const orderRow = await pool.query(
    `SELECT o.*, l.farmer_id, l.crop_name FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = $1`,
    [req.params.id]
  );
  if (!orderRow.rowCount) return res.status(404).json({ error: "Order not found" });
  const order = orderRow.rows[0];

  const isParty = order.buyer_id === req.user!.id || order.farmer_id === req.user!.id;
  if (!isParty) return res.status(403).json({ error: "Not a party to this order" });

  const paymentStatus = parsed.data.status === "delivered" ? "released" : undefined;

  const updated = await pool.query(
    `UPDATE orders SET status = $1, updated_at = now()${paymentStatus ? ", payment_status = $3" : ""}
     WHERE id = $2 RETURNING *`,
    paymentStatus ? [parsed.data.status, req.params.id, paymentStatus] : [parsed.data.status, req.params.id]
  );
  await pool.query(
    `INSERT INTO order_events (order_id, status, note) VALUES ($1, $2, $3)`,
    [req.params.id, parsed.data.status, parsed.data.note ?? null]
  );

  const io = req.app.get("io") as Server;
  io.to(`order:${req.params.id}`).emit("order:status", { orderId: req.params.id, status: parsed.data.status });

  const otherParty = req.user!.id === order.buyer_id ? order.farmer_id : order.buyer_id;
  await notify(
    io,
    otherParty,
    "order_status",
    `${order.crop_name}: ${STATUS_MESSAGE[parsed.data.status] ?? parsed.data.status}`,
    "/orders"
  );

  res.json({ order: updated.rows[0] });
}));

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// Buyer rates the farmer after delivery — the trust signal that used to live
// with the commission agent who vouched for both sides at the mandi.
ordersRouter.post("/:id/review", requireAuth, requireRole("buyer"), asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const orderRow = await pool.query(
    `SELECT o.*, l.farmer_id, l.crop_name FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = $1`,
    [req.params.id]
  );
  if (!orderRow.rowCount) return res.status(404).json({ error: "Order not found" });
  const order = orderRow.rows[0];

  if (order.buyer_id !== req.user!.id) return res.status(403).json({ error: "Not your order" });
  if (!["delivered", "paid_out"].includes(order.status)) {
    return res.status(409).json({ error: "You can only review an order after it's delivered" });
  }

  const existing = await pool.query("SELECT id FROM reviews WHERE order_id = $1", [req.params.id]);
  if (existing.rowCount) return res.status(409).json({ error: "You already reviewed this order" });

  const result = await pool.query(
    `INSERT INTO reviews (order_id, farmer_id, buyer_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.id, order.farmer_id, req.user!.id, parsed.data.rating, parsed.data.comment ?? null]
  );

  const io = req.app.get("io") as Server;
  await notify(io, order.farmer_id, "review", `You got a ${parsed.data.rating}-star review for ${order.crop_name}`, "/listings/mine");

  res.status(201).json({ review: result.rows[0] });
}));
