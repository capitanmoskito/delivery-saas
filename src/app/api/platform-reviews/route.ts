import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown; role?: unknown; tenantId?: unknown } | null;

async function getSession() {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.id !== "string") return null;
  if (session.role === "customer") return { kind: "customer" as const, userId: session.id };
  if (session.role === "restaurant_admin" && typeof session.tenantId === "string") return { kind: "business" as const, userId: session.id, tenantId: session.tenantId };
  return null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const review = session.kind === "customer"
    ? await prisma.platformReview.findUnique({ where: { userId: session.userId }, select: { rating: true, comment: true } })
    : await prisma.businessTestimonial.findFirst({ where: { tenantId: session.tenantId }, select: { rating: true, testimonial: true } });

  if (!review) return NextResponse.json({ review: null });
  return NextResponse.json({ review: { rating: review.rating, comment: "comment" in review ? review.comment : review.testimonial } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Inicia sesión para evaluar la plataforma." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rating = Number(data.rating);
  const comment = typeof data.comment === "string" ? data.comment.trim() : "";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000) {
    return NextResponse.json({ error: "Elige de 1 a 5 estrellas y un comentario de máximo 1000 caracteres." }, { status: 400 });
  }

  if (session.kind === "customer") {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { firstName: true, lastNamePaternal: true } });
    if (!user) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    const authorName = `${user.firstName} ${user.lastNamePaternal}`.trim();
    await prisma.platformReview.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, authorName, rating, comment: comment || null },
      update: { authorName, rating, comment: comment || null }
    });
    return NextResponse.json({ success: true });
  }

  const [tenant, profile, existing] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { businessName: true } }),
    prisma.businessProfile.findUnique({ where: { tenantId: session.tenantId }, select: { businessName: true, city: true, logoUrl: true } }),
    prisma.businessTestimonial.findFirst({ where: { tenantId: session.tenantId }, select: { id: true } })
  ]);
  if (!tenant) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const values = { businessName: profile?.businessName || tenant.businessName, city: profile?.city || "", rating, testimonial: comment, logoUrl: profile?.logoUrl ?? null, approved: true, active: true };
  if (existing) await prisma.businessTestimonial.update({ where: { id: existing.id }, data: values });
  else await prisma.businessTestimonial.create({ data: { tenantId: session.tenantId, ...values } });
  return NextResponse.json({ success: true });
}
