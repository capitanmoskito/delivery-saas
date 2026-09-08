import Link from "next/link";

export default function HomePage() {

  return (

    <main className="p-8">

      <h1 className="text-5xl font-bold">

        Delivery SaaS

      </h1>

      <p className="mt-4">

        Tu propio sistema de pedidos.
      </p>

      <div className="mt-8 flex gap-4">

        <Link href="/register-business">
          Registrar Negocio
        </Link>

        <Link href="/login">
          Ingresar
        </Link>

      </div>

    </main>
  );
}