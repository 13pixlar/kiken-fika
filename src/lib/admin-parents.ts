import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { fikaSignups, games, parents } from "@/src/db/schema";
import type { AdminParentRow } from "@/src/lib/types";

export async function getParentsWithSignups(): Promise<AdminParentRow[]> {
  const parentRows = await db
    .select({ id: parents.id, name: parents.name })
    .from(parents)
    .orderBy(asc(parents.name));

  const signupRows = await db
    .select({
      signupId: fikaSignups.id,
      parentId: fikaSignups.parentId,
      gameId: fikaSignups.gameId,
      startsAt: games.startsAt,
      title: games.title,
    })
    .from(fikaSignups)
    .innerJoin(games, eq(fikaSignups.gameId, games.id))
    .orderBy(asc(games.startsAt));

  const signupsByParent = new Map<number, AdminParentRow["signups"]>();
  for (const row of signupRows) {
    const list = signupsByParent.get(row.parentId) ?? [];
    list.push({
      signupId: row.signupId,
      gameId: row.gameId,
      startsAt: row.startsAt.toISOString(),
      title: row.title,
    });
    signupsByParent.set(row.parentId, list);
  }

  return parentRows.map((p) => ({
    ...p,
    signups: signupsByParent.get(p.id) ?? [],
  }));
}
