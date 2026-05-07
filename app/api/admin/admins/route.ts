import { NextResponse } from "next/server";
import { createAdminAccount, listAdminUsersPublic } from "@/src/lib/admin";
import { requireAdmin } from "@/src/lib/auth";
import { adminCreateAdminSchema } from "@/src/lib/validators";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admins = await listAdminUsersPublic();
  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = adminCreateAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    await createAdminAccount(parsed.data.username, parsed.data.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return NextResponse.json({ error: "Användarnamnet finns redan." }, { status: 409 });
    }
    throw error;
  }

  const admins = await listAdminUsersPublic();
  return NextResponse.json({ ok: true, admins });
}
