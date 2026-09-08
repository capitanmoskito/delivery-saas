export default function ReferralsPage() {
  return (
    <div className="p-6">

      <h1 className="mb-6 text-3xl font-bold">
        Referidos
      </h1>

      <div className="grid gap-4 md:grid-cols-3">

        <div className="rounded border p-4">
          <h2 className="font-semibold">
            Referidos Totales
          </h2>
          <p className="text-3xl">0</p>
        </div>

        <div className="rounded border p-4">
          <h2 className="font-semibold">
            Referidos Válidos
          </h2>
          <p className="text-3xl">0</p>
        </div>

        <div className="rounded border p-4">
          <h2 className="font-semibold">
            Descuentos Aplicados
          </h2>
          <p className="text-3xl">0%</p>
        </div>

      </div>

    </div>
  );
}