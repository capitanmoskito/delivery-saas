import {
  PromotionService
} from "@/src/modules/saas/promotions/promotion.service";

export default async function PromotionsPage() {

  const service =
    new PromotionService();

  const promotions =
    await service.getAllPromotions();

  return (

    <div className="p-6">

      <h1 className="mb-6 text-3xl font-bold">

        Promociones SaaS
      </h1>

      <div className="space-y-4">

        {promotions.map((promo) => (

          <div
            key={promo.id}
            className="rounded border p-4"
          >

            <h2 className="font-bold">

              {promo.name}
            </h2>

            <p>

              Código:

              {" "}

              {promo.code}
            </p>

            <p>

              Valor:

              {" "}

              {promo.value}
            </p>

          </div>

        ))}

      </div>

    </div>
  );
}