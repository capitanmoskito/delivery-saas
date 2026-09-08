import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/src//lib/prisma";

export default async function BusinessDashboardPage() {

  const cookieStore =
    await cookies();

  const userCookie =
    cookieStore.get("saas_user");

  if (!userCookie) {
    redirect("/login");
  }

  const user =
    JSON.parse(userCookie.value);

  const tenant =
    await prisma.tenant.findUnique({
      where: {
        id: user.tenantId,
      },
    });

  return (
    <div>

      <h1 className="mb-6 text-3xl font-bold">
        Dashboard Negocio
      </h1>

      <div className="grid gap-4 md:grid-cols-2">

        <div className="rounded border p-4">

          <h2 className="font-semibold">
            Negocio
          </h2>

          <p>
            {tenant?.businessName}
          </p>

        </div>

        <div className="rounded border p-4">

          <h2 className="font-semibold">
            Estado
          </h2>

          <p>
            {tenant?.status}
          </p>

        </div>

        <div className="rounded border p-4">

          <h2 className="font-semibold">
            Código Referido
          </h2>

          <p>
            {tenant?.referralCode}
          </p>

        </div>

        <div className="rounded border p-4">

          <h2 className="font-semibold">
            Trial
          </h2>

          <p>
            {tenant?.trialEndsAt
              ?.toLocaleDateString()}
          </p>

        </div>

      </div>

    </div>
  );
}