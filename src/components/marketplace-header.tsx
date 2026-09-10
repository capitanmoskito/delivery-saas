import Link from "next/link";

export default function MarketplaceHeader() {

  return (

    <header
      className="
        sticky
        top-0
        z-50
        border-b
        bg-white
      "
    >

      <div
        className="
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-between
          p-4
        "
      >

        <Link href="/" className="font-bold">
          TuPedidos
        </Link>

        <div className="flex gap-4">

          <Link href="/login">
            Ingresar
          </Link>

          <Link href="/register-business">
            Registrar Negocio
          </Link>

        </div>

      </div>

    </header>

  );
}