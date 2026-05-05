import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { badgeCache } from "@/src/db/schema";
import { BADGE_CACHE_TTL_MS, fetchSvenskFotbollBadgeUrl } from "@/src/lib/team-badge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team")?.trim() ?? "";

  if (!team) {
    return NextResponse.json({ error: "team is required" }, { status: 400 });
  }

  const now = new Date();

  const [cached] = await db
    .select({
      badgeUrl: badgeCache.badgeUrl,
      expiresAt: badgeCache.expiresAt,
    })
    .from(badgeCache)
    .where(and(eq(badgeCache.teamName, team), gt(badgeCache.expiresAt, now)))
    .limit(1);

  if (cached) {
    return NextResponse.json({ badgeUrl: cached.badgeUrl });
  }

  const resolved = await fetchSvenskFotbollBadgeUrl(team);

  if (resolved) {
    const expiresAt = new Date(Date.now() + BADGE_CACHE_TTL_MS);
    await db
      .insert(badgeCache)
      .values({
        teamName: team,
        badgeUrl: resolved,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: badgeCache.teamName,
        set: {
          badgeUrl: resolved,
          expiresAt,
        },
      });
  }

  return NextResponse.json({ badgeUrl: resolved });
}
