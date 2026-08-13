import { pool } from "../config/db.js";

export interface FallbackReply {
  reply: string;
  agent: "Basic Mode";
  degraded: true;
}

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["commission", "fee", "cut", "charge"],
    answer: "Mandi takes 0% commission. Farmers set their own price and buyers pay it directly — no middleman cut.",
  },
  {
    keywords: ["how does", "how mandi works", "what is mandi"],
    answer: "Mandi is a direct farmer-to-buyer produce marketplace. Farmers check today's real mandi price, list their harvest, and buyers order directly. Payment is held in escrow until the buyer confirms delivery.",
  },
  {
    keywords: ["pool", "group sell", "bulk"],
    answer: "Group Selling lets several farmers combine listings of the same crop into one pooled lot big enough to meet a bulk buyer's minimum order. Check the Group Selling page for open pools near you.",
  },
  {
    keywords: ["verified", "trust", "review", "rating"],
    answer: "Farmers get a Verified badge automatically once they've completed 3+ delivered orders — it can't be self-declared. Buyers rate farmers 1-5 stars after each delivery.",
  },
  {
    keywords: ["order status", "where is my order", "delivery", "pickup"],
    answer: "Check the Orders page for your order's current status — it moves through Order placed → Confirmed → Picked up → Delivered → Payment settled.",
  },
];

function matchFaq(message: string): string | null {
  const lower = message.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.answer;
  }
  return null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findMentionedCropPrice(message: string): Promise<string | null> {
  const crops = await pool.query(`SELECT DISTINCT crop_name FROM mandi_prices`);
  // Word-boundary match (with an optional plural "e?s?"), not substring —
  // "price" contains "rice" and would otherwise false-match the Rice crop
  // on every single price question, while still catching "tomatoes".
  const mentioned = crops.rows.find((r) =>
    new RegExp(`\\b${escapeRegExp(String(r.crop_name))}e?s?\\b`, "i").test(message)
  );
  if (!mentioned) return null;

  const prices = await pool.query(
    `SELECT DISTINCT ON (mandi_name) mandi_name, modal_price FROM mandi_prices
     WHERE crop_name = $1 ORDER BY mandi_name, price_date DESC LIMIT 3`,
    [mentioned.crop_name]
  );
  if (!prices.rowCount) return null;

  const lines = prices.rows.map((r) => `${r.mandi_name}: ₹${(Number(r.modal_price) / 100).toFixed(2)}/kg`).join(", ");
  return `Today's mandi price for ${mentioned.crop_name}: ${lines}.`;
}

const GENERIC_REPLY =
  "The smart assistant is temporarily unavailable. Try the Marketplace to browse listings, Mandi Prices for today's rates, or Group Selling to pool your harvest.";

/**
 * Answers what it can without an LLM — a real DB price lookup if the message
 * mentions a known crop, then a keyword-matched FAQ, then a generic pointer
 * to the relevant page. Mirrors the sibling Restaurant project's
 * answerWithFallback shape (reply + degraded flag).
 */
export async function answerWithFallback(message: string): Promise<FallbackReply> {
  try {
    const priceAnswer = await findMentionedCropPrice(message);
    if (priceAnswer) return { reply: priceAnswer, agent: "Basic Mode", degraded: true };
  } catch {
    // DB unreachable too — fall through.
  }

  const faqAnswer = matchFaq(message);
  if (faqAnswer) return { reply: faqAnswer, agent: "Basic Mode", degraded: true };

  return { reply: GENERIC_REPLY, agent: "Basic Mode", degraded: true };
}
