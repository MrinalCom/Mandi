import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(["farmer", "buyer"]).default("buyer"),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  languagePref: z.enum(["en", "hi"]).default("en"),
});

authRouter.post("/register", asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, phone, email, password, role, village, district, state, languagePref } = parsed.data;

  const existing = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
  if (existing.rowCount) {
    return res.status(409).json({ error: "Phone number already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, role, village, district, state, language_pref)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, phone, email, role, village, district, state, language_pref`,
    [name, phone, email ?? null, passwordHash, role, village ?? null, district ?? null, state ?? null, languagePref]
  );

  const user = result.rows[0];
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: "30d",
  });
  res.status(201).json({ user, token });
}));

const loginSchema = z.object({
  phone: z.string().min(6).trim(),
  password: z.string(),
});

authRouter.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { phone, password } = parsed.data;

  const result = await pool.query(
    `SELECT id, name, phone, email, password_hash, role, village, district, state, language_pref
     FROM users WHERE phone = $1`,
    [phone]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: "30d",
  });
  delete user.password_hash;
  res.json({ user, token });
}));

authRouter.get("/me", requireAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, phone, email, role, village, district, state, language_pref
     FROM users WHERE id = $1`,
    [req.user!.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "User not found" });
  res.json({ user: result.rows[0] });
}));
