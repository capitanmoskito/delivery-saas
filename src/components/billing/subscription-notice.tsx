import Link from "next/link";

import type { BillingLevel, BillingNotice } from "@/src/modules/billing/billing-notice";

const levelStyles: Record<BillingLevel, { bar: string; box: string }> = {
  green: { bar: "bg-green-500", box: "border-green-200 bg-green-50" },
  orange: { bar: "bg-orange-500", box: "border-orange-200 bg-orange-50" },
  red: { bar: "bg-red-600", box: "border-red-200 bg-red-50" }
};

export default function SubscriptionNotice({ notice, showLink = true }: { notice: BillingNotice; showLink?: boolean }) {
  const styles = levelStyles[notice.level];

  return (
    <section className={`mb-6 rounded-2xl border p-4 ${styles.box}`} role="alert">
      <p className="font-semibold text-[#2B2118]">{notice.title}</p>
      <p className="mt-1 text-sm text-[#2B2118]/80">{notice.message}</p>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={notice.progress}
        aria-label="Avance hacia la fecha de pago"
      >
        <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${notice.progress}%` }} />
      </div>

      {showLink && (
        <Link href="/business/billing" className="mt-3 inline-block text-sm font-semibold text-[#D95D39] underline underline-offset-2">
          Ir a pagar mi mensualidad
        </Link>
      )}
    </section>
  );
}
