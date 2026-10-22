import { getMonthlyPrice } from "@/src/modules/billing/subscription.service";
import SubscriptionPriceForm from "@/src/components/dashboard/subscription-price-form";
import AnnouncementsManager from "@/src/components/dashboard/announcements-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const monthlyPrice = await getMonthlyPrice();

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Configuración</h1>
      <SubscriptionPriceForm initialPrice={monthlyPrice} />
      <AnnouncementsManager />
    </div>
  );
}
