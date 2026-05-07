import { NextResponse } from "next/server";
import { resolveAdminUserIdFromSession, updateOwnAdminAccount } from "@/src/lib/admin";
import { getSession } from "@/src/lib/auth";
import { adminPatchMeSchema } from "@/src/lib/validators";

export async function PATCH(request: Request) {
  const session = await getSession();
  const adminId = await resolveAdminUserIdFromSession(session);
  if (adminId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = adminPatchMeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const usernameTrimmed = parsed.data.newUsername?.trim() ?? "";
  const passwordRaw = parsed.data.newPassword ?? "";
  const newUsername = usernameTrimmed.length > 0 ? usernameTrimmed : undefined;
  const newPassword = passwordRaw.length > 0 ? passwordRaw : undefined;

  const result = await updateOwnAdminAccount(adminId, {
    currentPassword: parsed.data.currentPassword,
    newUsername,
    newPassword,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (newUsername != null) {
    session.username = newUsername;
    await session.save();
  }

  return NextResponse.json({
    ok: true,
    username: session.username ?? "",
  });
}
