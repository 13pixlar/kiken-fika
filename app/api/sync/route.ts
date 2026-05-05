import { NextResponse } from "next/server";
import { syncGamesFromCalendar } from "@/src/lib/game-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncGamesFromCalendar();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Synkronisering misslyckades.",
        details: error instanceof Error ? error.message : "Okänt fel",
      },
      { status: 500 },
    );
  }
}
