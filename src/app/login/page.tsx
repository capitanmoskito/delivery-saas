"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

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

        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full border p-2 pr-10"
          />

          <button
            type="button"
            className="absolute right-2 top-2"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <Link
          href="/forgot-password"
          className="mb-3 block text-sm text-[#D95D39] hover:underline"
        >
          Olvidé mi contraseña
        </Link>

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