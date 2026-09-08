"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleLogin() {

    const response =
      await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            email,

            password
          })
        }
      );

    const data =
      await response.json();

    if (data.success) {

  if (data.user.role === "super_admin") {

    router.push("/saas/dashboard");

    return;
  }

  if (
    data.user.role ===
    "restaurant_admin"
  ) {

    router.push(
      "/business/dashboard"
    );

    return;
  }

  if (
    data.user.role ===
    "customer"
  ) {

    router.push("/");

    return;
  }
}

    alert(data.message);
  }

  return (

    <div className="flex min-h-screen items-center justify-center">

      <div className="w-full max-w-sm rounded-lg border p-6">

        <h1 className="mb-4 text-xl font-semibold">

          Login SaaS
        </h1>

        <input
          value={email}
          onChange={(e)=>
            setEmail(
              e.target.value
            )
          }
          placeholder="Correo"
          className="mb-3 w-full border p-2"
        />

        <input
          type="password"
          value={password}
          onChange={(e)=>
            setPassword(
              e.target.value
            )
          }
          placeholder="Contraseña"
          className="mb-3 w-full border p-2"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded bg-black p-2 text-white"
        >
          Entrar
        </button>

      </div>

    </div>
  );
}