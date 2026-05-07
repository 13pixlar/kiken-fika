import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { fikaSignups, games, parents } from "@/src/db/schema";
import type { AdminGameRow } from "@/src/lib/types";

export async function getAdminGamesWithSignups(): Promise<AdminGameRow[]> {
  const gameRows = await db
    .select()
    .from(games)
    .where(eq(games.isHomeGame, true))
    .orderBy(asc(games.startsAt));

  const signupRows = await db
    .select({
      signupId: fikaSignups.id,
      gameId: fikaSignups.gameId,
      parentId: fikaSignups.parentId,
      parentName: parents.name,
    })
    .from(fikaSignups)
    .innerJoin(parents, eq(fikaSignups.parentId, parents.id));

  const byGame = new Map<number, AdminGameRow["signups"]>();
  for (const row of signupRows) {
    const list = byGame.get(row.gameId) ?? [];
    list.push({
      signupId: row.signupId,
      parentId: row.parentId,
      parentName: row.parentName,
    });
    byGame.set(row.gameId, list);
  }

  return gameRows.map((g) => ({
    id: g.id,
    uid: g.uid,
    title: g.title,
    location: g.location,
    startsAt: g.startsAt.toISOString(),
    endsAt: g.endsAt ? g.endsAt.toISOString() : null,
    isHomeGame: g.isHomeGame,
    fikaSalesSek: g.fikaSalesSek ?? null,
    signups: byGame.get(g.id) ?? [],
  }));
}
