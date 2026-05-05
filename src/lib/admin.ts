import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { adminUsers } from "@/src/db/schema";

export async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(adminUsers).values({
    username,
    passwordHash,
  });
}

export async function verifyAdminCredentials(username: string, password: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (!admin) {
    return false;
  }

  return bcrypt.compare(password, admin.passwordHash);
}
