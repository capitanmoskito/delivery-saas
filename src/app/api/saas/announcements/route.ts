import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isSuperAdmin } from "@/src/lib/require-super-admin";
import { parseAnnouncement } from "@/src/modules/announcements/announcement-input";

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await prisma.platformAnnouncement.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));
}

export async function POST(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = parseAnnouncement(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  return NextResponse.json(await prisma.platformAnnouncement.create({ data: parsed.data }), { status: 201 });
}
