import { prisma }
  from "@/src/lib/prisma";

export default async function SettingsPage() {

  const settings =
    await prisma.saaSSettings.findFirst();

  return (

    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold">

        Configuración Global
      </h1>

      <pre>
        {JSON.stringify(
          settings,
          null,
          2
        )}
      </pre>

    </div>
  );
}