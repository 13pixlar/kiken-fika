import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    isAdmin: Boolean(session.isAdmin),
    username: session.username ?? null,
  });
}
