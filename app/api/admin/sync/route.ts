import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { db } from "@/src/db/client";
import { badgeCache } from "@/src/db/schema";
import { syncGamesFromCalendar } from "@/src/lib/game-sync";

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncGamesFromCalendar();
  await db.delete(badgeCache);
  return NextResponse.json(result);
}
