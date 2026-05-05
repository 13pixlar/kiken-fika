import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { fikaSignups, games, parents } from "@/src/db/schema";
import { MAX_SIGNUPS_PER_HOME_GAME } from "@/src/lib/constants";
import { signupDeleteSchema, signupPostSchema } from "@/src/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = signupPostSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { gameId, parentName, pin } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).limit(1);
      if (!game) {
        throw new Error("Matchen hittades inte.");
      }
      if (!game.isHomeGame) {
        throw new Error("Bara hemmamatcher kan ha fikaförsäljning.");
      }
      if (game.startsAt.getTime() <= Date.now()) {
        throw new Error("Du kan inte anmäla dig till en match som redan har startat.");
      }

      let [parent] = await tx.select().from(parents).where(eq(parents.name, parentName)).limit(1);

      if (!parent) {
        const pinHash = await bcrypt.hash(pin, 10);
        try {
          const [created] = await tx
            .insert(parents)
            .values({ name: parentName, pinHash })
            .returning();
          parent = created;
        } catch {
          const [retry] = await tx.select().from(parents).where(eq(parents.name, parentName)).limit(1);
          if (!retry) {
            throw new Error("Kunde inte skapa föräldrarad.");
          }
          const duplicatePinOk = await bcrypt.compare(pin, retry.pinHash);
          if (!duplicatePinOk) {
            throw new Error("Fel PIN. Det finns redan en förälder med det här namnet.");
          }
          parent = retry;
        }
      } else {
        const validPin = await bcrypt.compare(pin, parent.pinHash);
        if (!validPin) {
          throw new Error("Fel PIN.");
        }
      }

      const parentId = parent.id;

      const existingSignups = await tx
        .select()
        .from(fikaSignups)
        .where(eq(fikaSignups.gameId, gameId));

      if (existingSignups.some((signup) => signup.parentId === parentId)) {
        throw new Error("Du är redan anmäld till denna match.");
      }
      if (existingSignups.length >= MAX_SIGNUPS_PER_HOME_GAME) {
        throw new Error("Det finns redan två ansvariga för denna match.");
      }

      const [created] = await tx
        .insert(fikaSignups)
        .values({ gameId, parentId })
        .returning();

      return created;
    });

    return NextResponse.json({ signup: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte spara anmälan." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const payload = await request.json();
  const parsed = signupDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { gameId, parentName, pin } = parsed.data;

  try {
    const [parent] = await db.select().from(parents).where(eq(parents.name, parentName)).limit(1);
    if (!parent) {
      return NextResponse.json({ error: "Ingen förälder hittades med det namnet." }, { status: 404 });
    }

    const pinOk = await bcrypt.compare(pin, parent.pinHash);
    if (!pinOk) {
      return NextResponse.json({ error: "Fel PIN." }, { status: 401 });
    }

    const [deleted] = await db
      .delete(fikaSignups)
      .where(and(eq(fikaSignups.gameId, gameId), eq(fikaSignups.parentId, parent.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Ingen anmälan hittades att ta bort." }, { status: 404 });
    }

    return NextResponse.json({ removed: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte ta bort anmälan." },
      { status: 400 },
    );
  }
}
