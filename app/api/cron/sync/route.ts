import { NextResponse } from "next/server";
import { syncGamesFromCalendar } from "@/src/lib/game-sync";

export async function POST(request: Request) {
  const token = request.headers.get("x-cron-token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGamesFromCalendar();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
