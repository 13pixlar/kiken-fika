import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { fikaSignups } from "@/src/db/schema";
import { requireAdmin } from "@/src/lib/auth";
import { adminDeleteFikaSignupSchema } from "@/src/lib/validators";

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
