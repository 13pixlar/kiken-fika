import { asc, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { games } from "@/src/db/schema";
import { syncGamesFromCalendar } from "@/src/lib/game-sync";
import { formatVenueForDisplay } from "@/src/lib/format-venue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(games)
      .where(gt(games.startsAt, new Date()));
    if ((countRow?.count ?? 0) === 0) {
      await syncGamesFromCalendar();
    }

    const gameRows = await db.query.games.findMany({
      orderBy: [asc(games.startsAt)],
      with: {
        signups: {
          with: {
            parent: true,
          },
        },
      },
    });

    return NextResponse.json({
      games: gameRows.map((game) => ({
        id: game.id,
        uid: game.uid,
        title: game.title,
        location: formatVenueForDisplay(game.location),
        startsAt: game.startsAt,
        endsAt: game.endsAt,
        isHomeGame: game.isHomeGame,
        fikaSalesSek: game.fikaSalesSek ?? null,
        signups: game.signups.map((signup) => ({
          id: signup.id,
          parentId: signup.parentId,
          parentName: signup.parent.name,
        })),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Kunde inte hämta matcher.",
        details: error instanceof Error ? error.message : "Okänt fel",
      },
      { status: 500 },
    );
  }
}
