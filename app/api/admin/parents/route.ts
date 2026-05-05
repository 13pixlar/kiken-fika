import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { parents } from "@/src/db/schema";
import { getParentsWithSignups } from "@/src/lib/admin-parents";
import { requireAdmin } from "@/src/lib/auth";
import { createParentSchema } from "@/src/lib/validators";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getParentsWithSignups();
  return NextResponse.json({ parents: rows });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createParentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 10);
  try {
    const [created] = await db
      .insert(parents)
      .values({ name: parsed.data.name, pinHash })
      .returning({ id: parents.id, name: parents.name });
    return NextResponse.json({ parent: created });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte skapa förälder. Namnet kan redan finnas." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parentId } = (await request.json()) as { parentId?: number };
  if (!parentId) {
    return NextResponse.json({ error: "parentId saknas." }, { status: 400 });
  }

  await db.delete(parents).where(eq(parents.id, parentId));
  return NextResponse.json({ removed: true });
}
