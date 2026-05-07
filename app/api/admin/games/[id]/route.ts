import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { games } from "@/src/db/schema";
import { requireAdmin } from "@/src/lib/auth";
import { adminPatchGameFikaSalesSchema } from "@/src/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const gameId = Number(rawId);
  if (!Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: "Ogiltigt match-id." }, { status: 400 });
  }

  const payload = await request.json();
  const parsed = adminPatchGameFikaSalesSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const [existing] = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Matchen hittades inte." }, { status: 404 });
  }

  await db
    .update(games)
    .set({
      fikaSalesSek: parsed.data.fikaSalesSek,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));

  return NextResponse.json({ ok: true, fikaSalesSek: parsed.data.fikaSalesSek });
}
