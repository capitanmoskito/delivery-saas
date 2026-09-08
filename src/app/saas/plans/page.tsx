import { PlanService }
  from "@/src/modules/saas/plan.service";

export const dynamic = "force-dynamic";

export default async function PlansPage() {

  const planService =
    new PlanService();

  const plans =
    await planService.getAllPlans();

  return (

    <div className="p-6">

      <h1 className="mb-6 text-3xl font-bold">

        Planes SaaS
      </h1>

      <div className="space-y-4">

        {plans.map((plan) => (

          <div
            key={plan.id}
            className="rounded border p-4"
          >

            <h2 className="text-xl font-semibold">

              {plan.name}
            </h2>

            <p>
              {plan.description}
            </p>

            <p className="mt-2">

              ${plan.price}
            </p>

            <p>

              Estado:

              {" "}

              {plan.active
                ? "Activo"
                : "Inactivo"}
            </p>

          </div>

        ))}

      </div>

    </div>

  );
}