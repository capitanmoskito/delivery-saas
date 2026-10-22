import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isSuperAdmin } from "@/src/lib/require-super-admin";
import { parseAnnouncement } from "@/src/modules/announcements/announcement-input";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const parsed = parseAnnouncement(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await prisma.platformAnnouncement.updateMany({ where: { id }, data: parsed.data });
  if (result.count !== 1) return NextResponse.json({ error: "Aviso no encontrado." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.platformAnnouncement.deleteMany({ where: { id } });
  return NextResponse.json({ success: true });
}
