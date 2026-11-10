import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { getTenantOnboardingProgress } from "@/src/modules/tenants/tenant-onboarding";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (typeof user?.tenantId !== "string") {
      return NextResponse.json({ success: false, message: "Sesión no válida." }, { status: 401 });
    }

    const progress = await getTenantOnboardingProgress(user.tenantId);
    return NextResponse.json(
      { success: true, progress },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Business onboarding progress error:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo consultar el progreso del registro." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
