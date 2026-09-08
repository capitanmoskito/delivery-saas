"use client";

import { useState } from "react";

export default function RegisterBusinessPage() {

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState({

      businessName: "",

      ownerName: "",

      email: "",

      password: "",

      referralCode: ""
    });

  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    setLoading(true);

    const response =
      await fetch(
        "/api/business/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(form)
        }
      );

    const data =
      await response.json();

    setLoading(false);

    if (data.success) {

      alert(
        "Negocio registrado correctamente"
      );

      window.location.href =
        "/login";

      return;
    }

    alert(
      data.message ??
      "Error al registrar negocio"
    );
  }

  return (

    <div className="container mx-auto max-w-xl p-6">

      <h1 className="mb-6 text-3xl font-bold">

        Registra tu Negocio

      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >

        <input
          placeholder="Nombre del negocio"
          className="w-full border p-2"
          value={form.businessName}
          onChange={(e)=>
            setForm({
              ...form,
              businessName:
                e.target.value
            })
          }
        />

        <input
          placeholder="Nombre del propietario"
          className="w-full border p-2"
          value={form.ownerName}
          onChange={(e)=>
            setForm({
              ...form,
              ownerName:
                e.target.value
            })
          }
        />

        <input
          placeholder="Correo"
          className="w-full border p-2"
          value={form.email}
          onChange={(e)=>
            setForm({
              ...form,
              email:
                e.target.value
            })
          }
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full border p-2"
          value={form.password}
          onChange={(e)=>
            setForm({
              ...form,
              password:
                e.target.value
            })
          }
        />

        <input
          placeholder="Código referido (opcional)"
          className="w-full border p-2"
          value={form.referralCode}
          onChange={(e)=>
            setForm({
              ...form,
              referralCode:
                e.target.value
            })
          }
        />

        <button
          disabled={loading}
          className="w-full rounded bg-black p-2 text-white"
        >
          {loading
            ? "Registrando..."
            : "Crear Negocio"}
        </button>

      </form>

    </div>
  );
}