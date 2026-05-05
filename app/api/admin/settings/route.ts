import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth";
import { getAppConfig, upsertConfig } from "@/src/lib/settings";
import { settingSchema } from "@/src/lib/validators";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getAppConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = settingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga inställningar." }, { status: 400 });
  }

  await upsertConfig(parsed.data);
  return NextResponse.json({ ok: true });
}
