export default function BusinessesPage() {
  return (
    <div className="p-6">

      <h1 className="mb-6 text-3xl font-bold">
        Negocios
      </h1>

      <p>
        Administración de negocios registrados.
      </p>

      <div className="mt-6 rounded border p-4">
        Próximamente:
        <ul className="list-disc pl-6 mt-2">
          <li>Alta de negocios</li>
          <li>Activar Trial</li>
          <li>Suspender</li>
          <li>Administrar dominio</li>
        </ul>
      </div>

    </div>
  );
}