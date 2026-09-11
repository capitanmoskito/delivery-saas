"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {

    await fetch(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );

    router.push("/login");
  }

  return (

    <button
      onClick={handleLogout}
      className="rounded border bg-black px-3 py-1 text-white"
    >
      Cerrar sesión
    </button>

    ); }