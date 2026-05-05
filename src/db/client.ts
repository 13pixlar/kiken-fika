import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/src/db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "./data/app.db";
const databaseDir = path.dirname(databaseUrl);
if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const sqlite = createClient({
  url: databaseUrl.startsWith("file:") ? databaseUrl : `file:${databaseUrl}`,
});

export const db = drizzle(sqlite, { schema });
export { sqlite };
