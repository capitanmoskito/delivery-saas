"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function register() {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/customer/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo crear la cuenta"); return; }
      router.push("/customer/profile");
    } catch { setError("No se pudo conectar con el servidor"); } finally { setSaving(false); }
  }

  return <main className="mx-auto max-w-lg p-6"><h1 className="text-3xl font-bold">Crear cuenta</h1><p className="mt-2 text-slate-600">Guarda tus datos para pedir más rápido.</p><div className="mt-6 space-y-3"><input className="w-full border p-3" placeholder="Nombre" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /><input className="w-full border p-3" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /><input className="w-full border p-3" type="email" placeholder="Correo" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input className="w-full border p-3" type="password" placeholder="Contraseña" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><p className="text-xs text-slate-500">Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.</p>{error && <p className="text-sm text-red-600">{error}</p>}<button type="button" disabled={saving} onClick={register} className="w-full rounded bg-action px-4 py-3 text-white disabled:bg-gray-400">{saving ? "Creando..." : "Crear cuenta"}</button></div></main>;
}