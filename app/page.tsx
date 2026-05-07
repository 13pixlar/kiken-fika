import { asc } from "drizzle-orm";
import { db } from "@/src/db/client";
import { games } from "@/src/db/schema";
import { HomePageClient } from "@/src/components/home-page-client";
import { formatVenueForDisplay } from "@/src/lib/format-venue";

export const dynamic = "force-dynamic";

export default async function Home() {
  const gameRows = await db.query.games.findMany({
    with: {
      signups: {
        with: {
          parent: true,
        },
      },
    },
    orderBy: [asc(games.startsAt)],
  });

  return (
    <HomePageClient
      initialGames={gameRows.map((game) => ({
        id: game.id,
        uid: game.uid,
        title: game.title,
        location: formatVenueForDisplay(game.location),
        startsAt: game.startsAt.toISOString(),
        endsAt: game.endsAt ? game.endsAt.toISOString() : null,
        isHomeGame: game.isHomeGame,
        fikaSalesSek: game.fikaSalesSek ?? null,
        signups: game.signups.map((signup) => ({
          id: signup.id,
          parentId: signup.parentId,
          parentName: signup.parent.name,
        })),
      }))}
    />
  );
}
