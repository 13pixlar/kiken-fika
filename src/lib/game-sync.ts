import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/db/client";
import { games } from "@/src/db/schema";
import { parseGamesFromCalendar } from "@/src/lib/ics";
import { getAppConfig } from "@/src/lib/settings";

export async function syncGamesFromCalendar() {
  const config = await getAppConfig();
  const parsedGames = await parseGamesFromCalendar(
    config.calendarUrl,
    config.homeTeamName,
  );

  const now = new Date();
  for (const game of parsedGames) {
    await db
      .insert(games)
      .values({
        uid: game.uid,
        title: game.title,
        rawSummary: game.rawSummary,
        location: game.location,
        startsAt: game.startsAt,
        endsAt: game.endsAt,
        isHomeGame: game.isHomeGame,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: games.uid,
        set: {
          title: game.title,
          rawSummary: game.rawSummary,
          location: game.location,
          startsAt: game.startsAt,
          endsAt: game.endsAt,
          isHomeGame: game.isHomeGame,
          updatedAt: now,
        },
      });
  }

  if (parsedGames.length > 0) {
    const activeUids = parsedGames.map((game) => game.uid);
    const existing = await db.select({ id: games.id, uid: games.uid }).from(games);
    const stale = existing.filter((game) => !activeUids.includes(game.uid));

    if (stale.length > 0) {
      await db.delete(games).where(inArray(games.id, stale.map((game) => game.id)));
    }
  }

  return {
    synced: parsedGames.length,
    syncedAt: new Date().toISOString(),
  };
}

export async function getGameById(gameId: number) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return game ?? null;
}
