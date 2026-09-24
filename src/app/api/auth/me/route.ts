import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
}
