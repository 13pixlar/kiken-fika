import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { parents } from "@/src/db/schema";

export async function GET() {
  const rows = await db.select({ id: parents.id, name: parents.name }).from(parents).orderBy(asc(parents.name));
  return NextResponse.json({ parents: rows });
}
