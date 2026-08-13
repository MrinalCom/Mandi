import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pool } from "../config/db.js";

export interface AgentUserContext {
  id: string;
  role: "farmer" | "buyer" | "admin";
}

/**
 * Tools are built per-request (not module-level) so the requester's identity is
 * closed over instead of trusted as an LLM-supplied argument — the model picks
 * *what* to look up, never *whose* orders it's allowed to see.
 */
export function createMandiTools(user: AgentUserContext | undefined) {
  const getMandiPrice = tool(
    async ({ cropName }: { cropName: string }) => {
      const result = await pool.query(
        `SELECT DISTINCT ON (mandi_name) mandi_name, district, state, min_price, max_price, modal_price, price_date
         FROM mandi_prices WHERE crop_name ILIKE $1
         ORDER BY mandi_name, price_date DESC LIMIT 6`,
        [`%${cropName}%`]
      );
      if (!result.rowCount) return JSON.stringify({ found: false, message: `No price data for "${cropName}".` });
      return JSON.stringify({
        found: true,
        unit: "per quintal (100kg) — divide by 100 for per-kg",
        prices: result.rows,
      });
    },
    {
      name: "get_mandi_price",
      description: "Look up today's real mandi (wholesale market) min/max/modal price for a crop, across several mandis. Prices are per quintal.",
      schema: z.object({ cropName: z.string().min(1).describe("Crop name, e.g. Tomato") }),
    }
  );

  const getPriceTrend = tool(
    async ({ cropName }: { cropName: string }) => {
      const result = await pool.query(
        `SELECT price_date, AVG(modal_price)::numeric(10,2) AS avg_modal_price
         FROM mandi_prices WHERE crop_name ILIKE $1 AND price_date >= CURRENT_DATE - INTERVAL '14 days'
         GROUP BY price_date ORDER BY price_date ASC`,
        [`%${cropName}%`]
      );
      return JSON.stringify({ unit: "per quintal", trend: result.rows });
    },
    {
      name: "get_price_trend",
      description: "Get the last 14 days of average mandi price history for a crop, to describe whether it's trending up or down.",
      schema: z.object({ cropName: z.string().min(1) }),
    }
  );

  const searchListings = tool(
    async ({ cropName, maxPricePerKg, state }: { cropName?: string; maxPricePerKg?: number; state?: string }) => {
      const conditions = ["l.status = 'active'"];
      const params: unknown[] = [];
      if (cropName) {
        params.push(`%${cropName}%`);
        conditions.push(`l.crop_name ILIKE $${params.length}`);
      }
      if (typeof maxPricePerKg === "number") {
        params.push(maxPricePerKg);
        conditions.push(`l.price_per_kg <= $${params.length}`);
      }
      if (state) {
        params.push(state);
        conditions.push(`l.state = $${params.length}`);
      }
      const result = await pool.query(
        `SELECT l.id, l.crop_name, l.variety, l.quantity_kg, l.price_per_kg, l.quality_grade,
                l.village, l.district, l.state, u.name AS farmer_name
         FROM listings l JOIN users u ON u.id = l.farmer_id
         WHERE ${conditions.join(" AND ")} ORDER BY l.created_at DESC LIMIT 8`,
        params
      );
      return JSON.stringify({ listings: result.rows });
    },
    {
      name: "search_listings",
      description: "Search currently active produce listings on the marketplace, optionally filtered by crop, a maximum price per kg, and/or state.",
      schema: z.object({
        cropName: z.string().optional(),
        maxPricePerKg: z.number().positive().optional(),
        state: z.string().optional(),
      }),
    }
  );

  const getOpenPools = tool(
    async ({ cropName }: { cropName?: string }) => {
      const conditions = ["p.status = 'open'"];
      const params: unknown[] = [];
      if (cropName) {
        params.push(`%${cropName}%`);
        conditions.push(`p.crop_name ILIKE $${params.length}`);
      }
      const result = await pool.query(
        `SELECT p.id, p.crop_name, p.mandi_zone, p.price_per_kg, p.current_quantity_kg, p.target_quantity_kg
         FROM pool_groups p WHERE ${conditions.join(" AND ")} ORDER BY p.created_at DESC LIMIT 8`,
        params
      );
      return JSON.stringify({ pools: result.rows });
    },
    {
      name: "get_open_pools",
      description: "List currently open group-selling pools (farmers combining a crop to meet a bulk buyer's minimum order), optionally filtered by crop.",
      schema: z.object({ cropName: z.string().optional() }),
    }
  );

  const getOrderStatus = tool(
    async ({ orderId }: { orderId?: string }) => {
      if (!user) return JSON.stringify({ error: "You need to be logged in to check order status." });
      const params: unknown[] = [user.id];
      let where = user.role === "farmer"
        ? `l.farmer_id = $1`
        : `o.buyer_id = $1`;
      if (orderId) {
        params.push(orderId);
        where += ` AND o.id = $${params.length}`;
      }
      const result = await pool.query(
        `SELECT o.id, o.status, o.quantity_kg, o.total_price, o.created_at, l.crop_name
         FROM orders o JOIN listings l ON l.id = o.listing_id
         WHERE ${where} ORDER BY o.created_at DESC LIMIT 5`,
        params
      );
      return JSON.stringify({ orders: result.rows });
    },
    {
      name: "get_order_status",
      description: "Look up the current status of the logged-in user's own orders (as buyer or farmer). Pass orderId only if the user gave a specific order; otherwise leave it out to get their recent orders.",
      schema: z.object({ orderId: z.string().uuid().optional() }),
    }
  );

  const getFarmerReviews = tool(
    async ({ farmerName }: { farmerName: string }) => {
      const result = await pool.query(
        `SELECT r.rating, r.comment, u.name AS farmer_name
         FROM reviews r JOIN users u ON u.id = r.farmer_id
         WHERE u.name ILIKE $1 ORDER BY r.created_at DESC LIMIT 10`,
        [`%${farmerName}%`]
      );
      if (!result.rowCount) return JSON.stringify({ found: false });
      const avg = result.rows.reduce((s, r) => s + r.rating, 0) / result.rows.length;
      return JSON.stringify({ found: true, farmer: result.rows[0].farmer_name, averageRating: Number(avg.toFixed(1)), reviews: result.rows });
    },
    {
      name: "get_farmer_reviews",
      description: "Get a farmer's reviews and average rating by their name.",
      schema: z.object({ farmerName: z.string().min(1) }),
    }
  );

  return {
    get_mandi_price: getMandiPrice,
    get_price_trend: getPriceTrend,
    search_listings: searchListings,
    get_open_pools: getOpenPools,
    get_order_status: getOrderStatus,
    get_farmer_reviews: getFarmerReviews,
  };
}

export type MandiToolName = keyof ReturnType<typeof createMandiTools>;
