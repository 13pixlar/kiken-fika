import { NextResponse } from "next/server";
import { ensureAdminUser, verifyAdminCredentials } from "@/src/lib/admin";
import { getSession } from "@/src/lib/auth";
import { adminLoginSchema } from "@/src/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = adminLoginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Felaktiga inloggningsuppgifter." }, { status: 400 });
  }

  await ensureAdminUser();
  const { username, password } = parsed.data;
  const adminId = await verifyAdminCredentials(username, password);
  if (adminId == null) {
    return NextResponse.json({ error: "Fel användarnamn eller lösenord." }, { status: 401 });
  }

  const session = await getSession();
  session.isAdmin = true;
  session.username = username;
  session.adminUserId = adminId;
  await session.save();

  return NextResponse.json({ ok: true });
}
