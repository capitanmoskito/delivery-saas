import Image from "next/image";

import StarRating from "@/src/components/ui/star-rating";

type Props = {
  businessName: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  address: string | null;
  estimatedDeliveryLabel: string;
};

export default function StoreHero({
  businessName,
  description,
  logoUrl,
  bannerUrl,
  isOpen,
  rating,
  reviewCount,
  address,
  estimatedDeliveryLabel,
}: Props) {
  return (
    <section className="bg-white">
      <div className="relative h-70 w-full bg-slate-100 sm:h-90 md:h-90">
        {bannerUrl ? (
          <Image src={bannerUrl} alt={`Banner de ${businessName}`} fill unoptimized priority className="object-cover" />
        ) : (
          <div className="h-full w-full bg-linear-to-r from-dark to-action/70" />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="-mt-12 flex flex-col items-center gap-4 pt-[10px] sm:-mt-14 sm:flex-row sm:items-end">
          <div
            className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 bg-white shadow-md sm:h-28 sm:w-28 ${
              isOpen ? "border-emerald-500" : "border-slate-300"
            }`}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt={businessName} fill unoptimized className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-bold text-slate-400">
                {businessName.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center gap-1 pb-1 sm:items-start">
            <h1 className="text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">{businessName}</h1>

            <div className="flex items-center gap-2">
              <StarRating rating={rating} />
              <span className="text-sm font-medium">
                {reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount})` : "Sin calificaciones aún"}
              </span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}
              >
                {isOpen ? "Abierto" : "Cerrado"}
              </span>
            </div>
          </div>
        </div>

        {description && <p className="mt-4 max-w-2xl text-sm">{description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border py-4 text-sm">
          {address && <span>📍 {address}</span>}
          <span>🛵 {estimatedDeliveryLabel}</span>
        </div>
      </div>
    </section>
  );
}
