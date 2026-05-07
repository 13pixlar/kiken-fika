import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { fikaSignups, games, parents } from "@/src/db/schema";
import { MAX_SIGNUPS_PER_HOME_GAME } from "@/src/lib/constants";
import { requireAdmin } from "@/src/lib/auth";
import { adminCreateFikaSignupSchema, adminDeleteFikaSignupSchema } from "@/src/lib/validators";

function randomFourDigitPin(): string {
  return String(randomInt(1000, 10000));
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = adminCreateFikaSignupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { gameId, bypassSignupLimit } = parsed.data;
  let provisionalPin: string | undefined;

  try {
    const signup = await db.transaction(async (tx) => {
      const [game] = await tx.select().from(games).where(eq(games.id, gameId)).limit(1);
      if (!game) {
        throw new Error("Matchen hittades inte.");
      }
      if (!game.isHomeGame) {
        throw new Error("Bara hemmamatcher kan ha fika-anmälningar.");
      }

      let parentId: number;

      if (parsed.data.parentId != null) {
        parentId = parsed.data.parentId;
        const [parent] = await tx.select().from(parents).where(eq(parents.id, parentId)).limit(1);
        if (!parent) {
          throw new Error("Föräldern hittades inte.");
        }
      } else {
        const name = parsed.data.parentName!.trim();
        let resolvedParentId: number;

        const [existingParent] = await tx
          .select({ id: parents.id })
          .from(parents)
          .where(eq(parents.name, name))
          .limit(1);

        if (existingParent) {
          resolvedParentId = existingParent.id;
        } else {
          const pin = randomFourDigitPin();
          provisionalPin = pin;
          const pinHash = await bcrypt.hash(pin, 10);
          try {
            const [created] = await tx
              .insert(parents)
              .values({ name, pinHash })
              .returning({ id: parents.id });
            if (!created) {
              throw new Error("Kunde inte skapa föräldrarad.");
            }
            resolvedParentId = created.id;
          } catch {
            const [retry] = await tx
              .select({ id: parents.id })
              .from(parents)
              .where(eq(parents.name, name))
              .limit(1);
            if (!retry) {
              throw new Error("Kunde inte skapa föräldrarad.");
            }
            resolvedParentId = retry.id;
            provisionalPin = undefined;
          }
        }
        parentId = resolvedParentId;
      }

      const existing = await tx.select().from(fikaSignups).where(eq(fikaSignups.gameId, gameId));

      if (existing.some((row) => row.parentId === parentId)) {
        throw new Error("Den här föräldern är redan anmäld till matchen.");
      }

      if (!bypassSignupLimit && existing.length >= MAX_SIGNUPS_PER_HOME_GAME) {
        throw new Error(
          `Matchen har redan ${MAX_SIGNUPS_PER_HOME_GAME} fikaansvariga. Kryssa i ”fler än två” för historisk backfill.`,
        );
      }

      const [created] = await tx
        .insert(fikaSignups)
        .values({ gameId, parentId })
        .returning({ id: fikaSignups.id });

      return created;
    });

    return NextResponse.json({ signup, provisionalPin });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunde inte skapa anmälan." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = adminDeleteFikaSignupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const [deleted] = await db
    .delete(fikaSignups)
    .where(eq(fikaSignups.id, parsed.data.signupId))
    .returning({ id: fikaSignups.id });

  if (!deleted) {
    return NextResponse.json({ error: "Anmälan hittades inte." }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
