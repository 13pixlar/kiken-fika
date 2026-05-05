import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./client";
import { ensureAdminUser } from "../lib/admin";
import { ensureDefaultSettings } from "../lib/settings";

function ensureDatabaseDirectory() {
  const databasePath = process.env.DATABASE_URL ?? "./data/app.db";
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  ensureDatabaseDirectory();
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await ensureDefaultSettings();
  await ensureAdminUser();
  console.log("Database migrated and seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
