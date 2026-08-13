import "dotenv/config";
import { pool } from "../config/db.js";

// Refreshes mandi_prices with a much larger dataset than the small hand-written
// seed in db/init.sql.
//
// Path 1 (real data): if AGMARKNET_API_KEY is set, pulls the live "Variety-wise
// Daily Market Prices" resource from data.gov.in (the actual Agmarknet feed —
// resource id 9ef84268-d588-465a-a308-a864a43d0070) and inserts real government
// price records. Register a free key at https://data.gov.in/user/register.
//
// Path 2 (fallback, runs today without any key): generates a larger *synthetic*
// but realistically-shaped dataset — more crops, more mandis across more states,
// three weeks of daily history with a random walk around each crop's real-world
// ballpark price — so the price board and ticker have enough data to be useful
// without depending on an external key. Every synthetic row is exactly the same
// shape as a real Agmarknet row, so swapping to Path 1 later is a no-op for the
// rest of the app.

const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

interface PriceRow {
  crop_name: string;
  mandi_name: string;
  district: string;
  state: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  price_date: string; // YYYY-MM-DD
}

async function fetchFromAgmarknet(apiKey: string): Promise<PriceRow[]> {
  const url = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}?api-key=${apiKey}&format=json&limit=2000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Agmarknet API returned ${res.status}`);
  const data = (await res.json()) as { records?: Record<string, string>[] };
  const records = data.records ?? [];
  if (!records.length) throw new Error("Agmarknet API returned no records");

  return records
    .map((r) => ({
      crop_name: r.commodity,
      mandi_name: r.market,
      district: r.district,
      state: r.state,
      min_price: Number(r.min_price),
      max_price: Number(r.max_price),
      modal_price: Number(r.modal_price),
      price_date: r.arrival_date ? new Date(r.arrival_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    }))
    .filter((r) => r.crop_name && r.mandi_name && Number.isFinite(r.modal_price) && r.modal_price > 0);
}

// crop -> [base price per quintal, mandis it commonly trades in]
const MANDIS: Record<string, { district: string; state: string }> = {
  "Azadpur Mandi": { district: "North Delhi", state: "Delhi" },
  "Ghazipur Mandi": { district: "East Delhi", state: "Delhi" },
  "Vashi APMC": { district: "Thane", state: "Maharashtra" },
  "Pune Market Yard": { district: "Pune", state: "Maharashtra" },
  "Lasalgaon Mandi": { district: "Nashik", state: "Maharashtra" },
  "Koyambedu Market": { district: "Chennai", state: "Tamil Nadu" },
  "Agra Mandi": { district: "Agra", state: "Uttar Pradesh" },
  "Lucknow Mandi": { district: "Lucknow", state: "Uttar Pradesh" },
  "Indore Mandi": { district: "Indore", state: "Madhya Pradesh" },
  "Bhopal Mandi": { district: "Bhopal", state: "Madhya Pradesh" },
  "Karnal Mandi": { district: "Karnal", state: "Haryana" },
  "Khanna Mandi": { district: "Ludhiana", state: "Punjab" },
  "Yeshwanthpur Mandi": { district: "Bengaluru", state: "Karnataka" },
  "Sealdah Mandi": { district: "Kolkata", state: "West Bengal" },
  "Muhana Mandi": { district: "Jaipur", state: "Rajasthan" },
  "Patna Mandi": { district: "Patna", state: "Bihar" },
  "Bowenpally Mandi": { district: "Hyderabad", state: "Telangana" },
};

const CROPS: Record<string, { base: number; mandis: string[] }> = {
  Tomato: { base: 1100, mandis: ["Azadpur Mandi", "Vashi APMC", "Koyambedu Market", "Pune Market Yard"] },
  Onion: { base: 1650, mandis: ["Lasalgaon Mandi", "Azadpur Mandi", "Pune Market Yard"] },
  Potato: { base: 820, mandis: ["Agra Mandi", "Azadpur Mandi", "Lucknow Mandi"] },
  Okra: { base: 2000, mandis: ["Koyambedu Market", "Yeshwanthpur Mandi"] },
  Cauliflower: { base: 1000, mandis: ["Ghazipur Mandi", "Lucknow Mandi", "Sealdah Mandi"] },
  Cabbage: { base: 700, mandis: ["Ghazipur Mandi", "Bhopal Mandi", "Sealdah Mandi"] },
  Brinjal: { base: 1300, mandis: ["Koyambedu Market", "Bowenpally Mandi", "Sealdah Mandi"] },
  "Green Chilli": { base: 2800, mandis: ["Bowenpally Mandi", "Yeshwanthpur Mandi", "Koyambedu Market"] },
  Garlic: { base: 9500, mandis: ["Indore Mandi", "Bhopal Mandi", "Azadpur Mandi"] },
  Ginger: { base: 6200, mandis: ["Muhana Mandi", "Sealdah Mandi"] },
  Wheat: { base: 2250, mandis: ["Indore Mandi", "Bhopal Mandi", "Khanna Mandi"] },
  Rice: { base: 2750, mandis: ["Karnal Mandi", "Patna Mandi", "Khanna Mandi"] },
  Chana: { base: 5400, mandis: ["Indore Mandi", "Muhana Mandi"] },
  Groundnut: { base: 5800, mandis: ["Bhopal Mandi", "Bowenpally Mandi"] },
  Soybean: { base: 4600, mandis: ["Indore Mandi", "Bhopal Mandi"] },
  Turmeric: { base: 7800, mandis: ["Bowenpally Mandi", "Koyambedu Market"] },
  Banana: { base: 1200, mandis: ["Vashi APMC", "Koyambedu Market", "Patna Mandi"] },
  Mango: { base: 3500, mandis: ["Koyambedu Market", "Lucknow Mandi"] },
};

const DAYS_OF_HISTORY = 21;

function generateSynthetic(): PriceRow[] {
  const rows: PriceRow[] = [];
  const today = new Date();

  for (const [cropName, { base, mandis }] of Object.entries(CROPS)) {
    for (const mandiName of mandis) {
      const loc = MANDIS[mandiName];
      let modal = base * (0.9 + Math.random() * 0.2); // mandi-to-mandi starting variation

      for (let d = DAYS_OF_HISTORY - 1; d >= 0; d--) {
        // Random walk so consecutive days look like real market drift, not noise.
        // Perishables (tomato, onion) genuinely swing double digits day-to-day
        // around weather/supply shocks, so ±10% keeps the price-alert threshold
        // below meaningfully reachable instead of mathematically unreachable.
        const drift = (Math.random() - 0.5) * 0.2;
        modal = Math.max(base * 0.5, modal * (1 + drift));
        const spread = modal * (0.12 + Math.random() * 0.1);

        const date = new Date(today);
        date.setDate(date.getDate() - d);

        rows.push({
          crop_name: cropName,
          mandi_name: mandiName,
          district: loc.district,
          state: loc.state,
          min_price: Number((modal - spread).toFixed(2)),
          max_price: Number((modal + spread).toFixed(2)),
          modal_price: Number(modal.toFixed(2)),
          price_date: date.toISOString().slice(0, 10),
        });
      }
    }
  }
  return rows;
}

async function insertRows(rows: PriceRow[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE mandi_prices");
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, idx) => {
        const base = idx * 8;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
      });
      const values: unknown[] = [];
      for (const r of chunk) {
        values.push(r.crop_name, r.mandi_name, r.district, r.state, r.min_price, r.max_price, r.modal_price, r.price_date);
      }
      await client.query(
        `INSERT INTO mandi_prices (crop_name, mandi_name, district, state, min_price, max_price, modal_price, price_date)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const PRICE_ALERT_THRESHOLD_PCT = 8;

// Compares each crop's most recent day against the day before it (averaged
// across mandis) and notifies anyone watching that crop if it moved sharply —
// the alert a farmer would otherwise only get by checking the price board
// themselves every morning.
async function notifyPriceWatchers(rows: PriceRow[]) {
  const byCrop = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    if (!byCrop.has(r.crop_name)) byCrop.set(r.crop_name, new Map());
    const byDate = byCrop.get(r.crop_name)!;
    if (!byDate.has(r.price_date)) byDate.set(r.price_date, []);
    byDate.get(r.price_date)!.push(r.modal_price);
  }

  let alerted = 0;
  for (const [cropName, byDate] of byCrop) {
    const dates = Array.from(byDate.keys()).sort();
    if (dates.length < 2) continue;
    const [prevDate, lastDate] = dates.slice(-2);
    const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
    const prevAvg = avg(byDate.get(prevDate)!);
    const lastAvg = avg(byDate.get(lastDate)!);
    const pctChange = ((lastAvg - prevAvg) / prevAvg) * 100;
    if (Math.abs(pctChange) < PRICE_ALERT_THRESHOLD_PCT) continue;

    const watchers = await pool.query(
      `SELECT user_id FROM price_watches WHERE crop_name ILIKE $1`,
      [cropName]
    );
    if (!watchers.rowCount) continue;

    const direction = pctChange > 0 ? "up" : "down";
    const message = `${cropName} mandi price moved ${direction} ${Math.abs(pctChange).toFixed(1)}% — now ₹${(lastAvg / 100).toFixed(2)}/kg`;
    for (const w of watchers.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'price_alert', $2, '/mandi-prices')`,
        [w.user_id, message]
      );
      alerted++;
    }
  }
  if (alerted) console.log(`Sent ${alerted} price alert notification(s).`);
}

async function main() {
  const apiKey = process.env.AGMARKNET_API_KEY;
  let rows: PriceRow[] = [];
  let source = "synthetic";

  if (apiKey) {
    try {
      rows = await fetchFromAgmarknet(apiKey);
      source = "data.gov.in Agmarknet (live)";
    } catch (err) {
      console.warn(`Live Agmarknet fetch failed (${(err as Error).message}), falling back to synthetic data.`);
    }
  }

  if (!rows.length) {
    rows = generateSynthetic();
  }

  await insertRows(rows);
  console.log(`Loaded ${rows.length} mandi price rows from ${source}.`);
  await notifyPriceWatchers(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
