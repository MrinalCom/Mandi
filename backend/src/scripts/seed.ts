import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

// Demo accounts + listings so the marketplace isn't empty on first run.
// All demo accounts share the password below.
const DEMO_PASSWORD = "password123";

async function upsertUser(u: {
  name: string;
  phone: string;
  role: "farmer" | "buyer";
  village?: string;
  district?: string;
  state?: string;
}) {
  const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [u.phone]);
  if (existing.rowCount) return existing.rows[0].id as string;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const result = await pool.query(
    `INSERT INTO users (name, phone, password_hash, role, village, district, state)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [u.name, u.phone, passwordHash, u.role, u.village ?? null, u.district ?? null, u.state ?? null]
  );
  return result.rows[0].id as string;
}

async function main() {
  const farmer1 = await upsertUser({
    name: "Ramesh Yadav",
    phone: "9800000001",
    role: "farmer",
    village: "Bilaspur",
    district: "Agra",
    state: "Uttar Pradesh",
  });
  const farmer2 = await upsertUser({
    name: "Sunita Devi",
    phone: "9800000002",
    role: "farmer",
    village: "Rampur",
    district: "Nashik",
    state: "Maharashtra",
  });
  const buyer1 = await upsertUser({
    name: "Fresh Basket Retail",
    phone: "9800000003",
    role: "buyer",
    district: "North Delhi",
    state: "Delhi",
  });

  const existingListings = await pool.query("SELECT COUNT(*) FROM listings");
  if (Number(existingListings.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO listings (farmer_id, crop_name, variety, quantity_kg, price_per_kg, quality_grade, village, district, state)
       VALUES
        ($1, 'Potato', 'Kufri Jyoti', 500, 9.5, 'A', 'Bilaspur', 'Agra', 'Uttar Pradesh'),
        ($1, 'Wheat', 'Sharbati', 1000, 24, 'A', 'Bilaspur', 'Agra', 'Uttar Pradesh'),
        ($2, 'Onion', 'Nashik Red', 800, 17, 'A', 'Rampur', 'Nashik', 'Maharashtra'),
        ($2, 'Tomato', 'Hybrid', 300, 12, 'B', 'Rampur', 'Nashik', 'Maharashtra')`,
      [farmer1, farmer2]
    );
  }

  const existingPools = await pool.query("SELECT COUNT(*) FROM pool_groups");
  if (Number(existingPools.rows[0].count) === 0) {
    await pool.query(
      `INSERT INTO pool_groups (crop_name, mandi_zone, price_per_kg, target_quantity_kg, current_quantity_kg, created_by)
       VALUES ('Onion', 'Nashik', 16.5, 3000, 800, $1)`,
      [farmer2]
    );
  }

  console.log("Seed complete. Demo accounts (password: %s):", DEMO_PASSWORD);
  console.log("  Farmer: 9800000001 (Ramesh Yadav)");
  console.log("  Farmer: 9800000002 (Sunita Devi)");
  console.log("  Buyer:  9800000003 (Fresh Basket Retail)");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
