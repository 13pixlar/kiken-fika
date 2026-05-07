import { NextResponse } from "next/server";
import { getAdminGamesWithSignups } from "@/src/lib/admin-games";
import { requireAdmin } from "@/src/lib/auth";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await getAdminGamesWithSignups();
  return NextResponse.json({ games });
}
