"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

type PaymentSettings = {
  providers: {
    mercadopago: { enabled: boolean; configured: boolean };
    clip: { enabled: boolean; configured: boolean };
  };
  transfer: {
    enabled: boolean;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    clabe: string;
    instructions: string;
  };
};

const emptySettings: PaymentSettings = {
  providers: {
    mercadopago: { enabled: false, configured: false },
    clip: { enabled: false, configured: false },
  },
  transfer: { enabled: false, bankName: "", accountHolder: "", accountNumber: "", clabe: "", instructions: "" },
};

export default function PaymentMethodsSettings({ onSaved }: { onSaved: () => void }) {
  const [settings, setSettings] = useState(emptySettings);
  const [mercadoPagoToken, setMercadoPagoToken] = useState("");
  const [mercadoPagoWebhookSecret, setMercadoPagoWebhookSecret] = useState("");
  const [clipApiKey, setClipApiKey] = useState("");
  const [clipApiSecret, setClipApiSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/payment-methods")
      .then(async (response) => {
        const data: PaymentSettings & { error?: string } = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la configuración de pagos.");
        if (!cancelled) setSettings(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración de pagos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateTransfer(field: keyof PaymentSettings["transfer"], value: string | boolean) {
    setSettings((current) => ({ ...current, transfer: { ...current.transfer, [field]: value } }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: {
            mercadopago: { ...settings.providers.mercadopago, accessToken: mercadoPagoToken, webhookSecret: mercadoPagoWebhookSecret },
            clip: { ...settings.providers.clip, apiKey: clipApiKey, apiSecret: clipApiSecret },
          },
          transfer: settings.transfer,
        }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo guardar la configuración de pagos.");
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border p-8">
      <h2 className="mb-2 text-2xl font-bold">Métodos de pago</h2>
      <p className="mb-6 text-sm text-slate-600">Las credenciales se cifran y solo se usan desde el servidor. Al dejar un campo secreto vacío se conserva el valor guardado. Para activar tarjetas, configura en el servidor la clave de cifrado y la URL HTTPS pública indicada en el README.</p>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando configuración...</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <fieldset className="space-y-4 rounded border p-5">
              <legend className="px-2 font-semibold">Mercado Pago</legend>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.providers.mercadopago.enabled} onChange={(event) => setSettings((current) => ({ ...current, providers: { ...current.providers, mercadopago: { ...current.providers.mercadopago, enabled: event.target.checked } } }))} />
                <span>Habilitar pago con tarjeta</span>
              </label>
              <label className="block space-y-1 text-sm font-medium">Access Token
                <input type="password" autoComplete="new-password" value={mercadoPagoToken} onChange={(event) => setMercadoPagoToken(event.target.value)} placeholder={settings.providers.mercadopago.configured ? "Token guardado" : "APP_USR-..."} className="w-full border p-3 font-normal" />
              </label>
              <label className="block space-y-1 text-sm font-medium">Secreto de firma del webhook
                <input type="password" autoComplete="new-password" value={mercadoPagoWebhookSecret} onChange={(event) => setMercadoPagoWebhookSecret(event.target.value)} placeholder={settings.providers.mercadopago.configured ? "Secreto guardado" : "Secreto de Webhooks en Mercado Pago"} className="w-full border p-3 font-normal" />
              </label>
            </fieldset>

            <fieldset className="space-y-4 rounded border p-5">
              <legend className="px-2 font-semibold">Clip</legend>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.providers.clip.enabled} onChange={(event) => setSettings((current) => ({ ...current, providers: { ...current.providers, clip: { ...current.providers.clip, enabled: event.target.checked } } }))} />
                <span>Habilitar pago con tarjeta</span>
              </label>
              <label className="block space-y-1 text-sm font-medium">API Key
                <input type="password" autoComplete="new-password" value={clipApiKey} onChange={(event) => setClipApiKey(event.target.value)} placeholder={settings.providers.clip.configured ? "Credenciales guardadas" : "API Key de Clip"} className="w-full border p-3 font-normal" />
              </label>
              <label className="block space-y-1 text-sm font-medium">Clave secreta
                <input type="password" autoComplete="new-password" value={clipApiSecret} onChange={(event) => setClipApiSecret(event.target.value)} placeholder={settings.providers.clip.configured ? "Credenciales guardadas" : "Clave secreta de Clip"} className="w-full border p-3 font-normal" />
              </label>
            </fieldset>
          </div>

          <fieldset className="space-y-4 rounded border p-5">
            <legend className="px-2 font-semibold">Transferencia bancaria</legend>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.transfer.enabled} onChange={(event) => updateTransfer("enabled", event.target.checked)} />
              <span>Habilitar transferencia</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">Banco
                <input value={settings.transfer.bankName} onChange={(event) => updateTransfer("bankName", event.target.value)} className="w-full border p-3 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-medium">Titular de la cuenta
                <input value={settings.transfer.accountHolder} onChange={(event) => updateTransfer("accountHolder", event.target.value)} className="w-full border p-3 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-medium">CLABE (18 dígitos)
                <input inputMode="numeric" maxLength={18} value={settings.transfer.clabe} onChange={(event) => updateTransfer("clabe", event.target.value.replace(/\D/g, "").slice(0, 18))} className="w-full border p-3 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-medium">Número de cuenta (opcional)
                <input value={settings.transfer.accountNumber} onChange={(event) => updateTransfer("accountNumber", event.target.value)} className="w-full border p-3 font-normal" />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium">Instrucciones para el cliente
              <textarea rows={3} maxLength={500} value={settings.transfer.instructions} onChange={(event) => updateTransfer("instructions", event.target.value)} className="w-full border p-3 font-normal" />
            </label>
          </fieldset>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded bg-action px-5 py-3 font-medium text-white disabled:bg-gray-400">
            <Save size={18} /> {saving ? "Guardando..." : "Guardar métodos de pago"}
          </button>
        </div>
      )}
    </section>
  );
}
