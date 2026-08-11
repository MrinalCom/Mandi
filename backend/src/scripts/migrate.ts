import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "../config/db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

async function main() {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(path.join(dir, file), "utf-8");
    console.log(`Applying ${file}...`);
    await pool.query(sql);
  }
  console.log("Migrations applied.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
