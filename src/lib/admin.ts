import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
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

/** Returns admin row id when username/password match; otherwise `null`. */
export async function verifyAdminCredentials(username: string, password: string): Promise<number | null> {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);

  if (!admin) {
    return null;
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  return ok ? admin.id : null;
}

export async function resolveAdminUserIdFromSession(session: {
  isAdmin?: boolean;
  adminUserId?: number;
  username?: string;
}): Promise<number | null> {
  if (!session.isAdmin) {
    return null;
  }
  if (session.adminUserId != null) {
    return session.adminUserId;
  }
  if (!session.username) {
    return null;
  }
  const [row] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, session.username))
    .limit(1);
  return row?.id ?? null;
}

export async function listAdminUsersPublic() {
  const rows = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.username));

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createAdminAccount(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(adminUsers).values({ username, passwordHash });
}

export async function updateOwnAdminAccount(
  adminId: number,
  args: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  },
): Promise<{ error?: string }> {
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1);
  if (!admin) {
    return { error: "Kontot hittades inte." };
  }

  const currentOk = await bcrypt.compare(args.currentPassword, admin.passwordHash);
  if (!currentOk) {
    return { error: "Fel nuvarande lösenord." };
  }

  const updates: { username?: string; passwordHash?: string } = {};

  if (args.newUsername != null && args.newUsername !== admin.username) {
    const [taken] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.username, args.newUsername))
      .limit(1);
    if (taken) {
      return { error: "Användarnamnet finns redan." };
    }
    updates.username = args.newUsername;
  }

  if (args.newPassword != null) {
    updates.passwordHash = await bcrypt.hash(args.newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return {};
  }

  await db.update(adminUsers).set(updates).where(eq(adminUsers.id, adminId));
  return {};
}
