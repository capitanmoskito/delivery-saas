import { redirect } from "next/navigation";

import PayButton from "@/src/components/billing/pay-button";
import SubscriptionNotice from "@/src/components/billing/subscription-notice";
import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";
import { getBillingOverview, syncSubscriptionPayment } from "@/src/modules/billing/subscription.service";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  trial: "Periodo de prueba",
  pending_payment: "Pago pendiente",
  active: "Activa",
  suspended: "Suspendida",
  cancelled: "Cancelada"
};

const paymentLabels: Record<string, string> = { paid: "Pagado", pending: "Pendiente", failed: "Fallido" };

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paymentId?: string; status?: string }> }) {
  const user = await getCurrentUser();
  if (!user?.tenantId) redirect("/login");

  const { paymentId, status } = await searchParams;
  let returned: "paid" | "pending" | "failed" | null = null;

  if (paymentId) {
    try {
      const payment = await syncSubscriptionPayment({ id: paymentId, tenantId: user.tenantId });
      if (payment) returned = payment.status === "paid" ? "paid" : status === "failed" ? "failed" : "pending";
    } catch (error) {
      console.error("Error verifying subscription payment:", error);
    }
  }

  const [overview, payments] = await Promise.all([
    getBillingOverview(user.tenantId),
    prisma.subscriptionPayment.findMany({
      where: { tenantId: user.tenantId, status: { not: "failed" } },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);
  if (!overview) redirect("/login");

  const isTrial = overview.tenantStatus === "trial";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold text-[#2B2118]">Pago de mensualidad</h1>

      {returned === "paid" && <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">¡Pago recibido! Tu suscripción fue actualizada.</p>}
      {returned === "pending" && <p className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">Estamos esperando la confirmación de Clip. Actualiza esta página en unos minutos.</p>}
      {returned === "failed" && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">El pago no se completó. Puedes intentarlo de nuevo.</p>}

      {overview.notice && <SubscriptionNotice notice={overview.notice} />}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Estado del servicio</dt>
            <dd className="font-semibold">{statusLabels[overview.tenantStatus] ?? overview.tenantStatus}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">{isTrial ? "Fin de la prueba" : "Próximo pago"}</dt>
            <dd className="font-semibold">{formatDate(overview.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Mensualidad</dt>
            <dd className="font-semibold">{formatMoney(overview.monthlyPrice, overview.currency)} / mes</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Último pago</dt>
            <dd className="font-semibold">{formatDate(overview.lastPaymentAt)}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t pt-5">
          <PayButton label={`Pagar ${formatMoney(overview.monthlyPrice, overview.currency)} con Clip`} />
          <p className="mt-3 text-xs text-slate-500">El pago se procesa de forma segura con Clip. Al confirmarse, tu suscripción se renueva por un mes.</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Historial de pagos</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-white">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{formatMoney(payment.amount, payment.currency)}</p>
                  <p className="text-slate-500">{formatDate(payment.paidAt ?? payment.createdAt)}{payment.periodEnd ? ` · cubre hasta ${formatDate(payment.periodEnd)}` : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                  {paymentLabels[payment.status] ?? payment.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
