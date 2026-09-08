"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { validatePassword } from "@/src/lib/password-validator";

export default function RegisterBusinessPage() {
  const router = useRouter();

  const [form, setForm] =
  useState({

    businessName: "",

    firstName: "",

    lastNamePaternal: "",

    lastNameMaternal: "",

    email: "",

    password: "",

    referralCode: ""
  });

  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = validatePassword(form.password);
  const emailsMatch = form.email === confirmEmail;
  const passwordsMatch = form.password === confirmPassword;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!emailsMatch || !passwordsMatch) {
      alert("Revisa que los correos y las contraseñas coincidan.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/business/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const text = await response.text();
      let data: { success?: boolean; message?: string };

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respuesta inválida:", text);
        alert("Revisa la consola del navegador");
        return;
      }

      if (data.success) {
        alert("Negocio registrado correctamente");
        router.push("/login");
        return;
      }

      alert(data.message ?? "Error al registrar negocio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Registra tu Negocio</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Nombre del negocio"
          className="w-full border p-2"
          value={form.businessName}
          onChange={(e) =>
            setForm({
              ...form,
              businessName: e.target.value,
            })
          }
        />

        <input
  placeholder="Nombres"
  className="w-full border p-2"
  value={form.firstName}
  onChange={(e)=>
    setForm({
      ...form,
      firstName:
        e.target.value
    })
  }
/>

<input
  placeholder="Apellido paterno"
  className="w-full border p-2"
  value={form.lastNamePaternal}
  onChange={(e)=>
    setForm({
      ...form,
      lastNamePaternal:
        e.target.value
    })
  }
/>

<input
  placeholder="Apellido materno"
  className="w-full border p-2"
  value={form.lastNameMaternal}
  onChange={(e)=>
    setForm({
      ...form,
      lastNameMaternal:
        e.target.value
    })
  }
/>

        <input
          placeholder="Correo"
          type="email"
          className="w-full border p-2"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
        />

        <input
          placeholder="Confirma tu correo"
          type="email"
          className="w-full border p-2"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
        />

        {confirmEmail && !emailsMatch && (
          <p className="text-sm text-red-600">Los correos no coinciden</p>
        )}

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            className="w-full border p-2 pr-10"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
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

        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repite tu contraseña"
            className="w-full border p-2 pr-10"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="button"
            className="absolute right-2 top-2"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {confirmPassword && !passwordsMatch && (
          <p className="text-sm text-red-600">Las contraseñas no coinciden</p>
        )}

        <div className="rounded border p-3 text-sm">
          <p>{passwordRules.minLength ? "✅" : "❌"} Mínimo 8 caracteres</p>
          <p>{passwordRules.uppercase ? "✅" : "❌"} Una letra mayúscula</p>
          <p>{passwordRules.lowercase ? "✅" : "❌"} Una letra minúscula</p>
          <p>{passwordRules.number ? "✅" : "❌"} Un número</p>
          <p>{passwordRules.special ? "✅" : "❌"} Un carácter especial</p>
        </div>

        <input
          placeholder="Código referido (opcional)"
          className="w-full border p-2"
          value={form.referralCode}
          onChange={(e) =>
            setForm({
              ...form,
              referralCode: e.target.value,
            })
          }
        />

        <button
          type="submit"
          disabled={
            loading ||
            !emailsMatch ||
            !passwordsMatch ||
            !passwordRules.minLength ||
            !passwordRules.uppercase ||
            !passwordRules.lowercase ||
            !passwordRules.number ||
            !passwordRules.special
          }
          className="w-full rounded bg-black p-2 text-white disabled:bg-gray-400"
        >
          {loading ? "Registrando..." : "Crear Negocio"}
        </button>
      </form>
    </div>
  );
}