"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import ImageDropzone from "@/src/components/dashboard/image-dropzone";

type Announcement = {
  id: string;
  type: "text" | "image";
  title: string | null;
  message: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

type Form = { type: "text" | "image"; title: string; message: string; imageUrl: string; linkUrl: string; active: boolean; startsAt: string; endsAt: string; sortOrder: string };

const emptyForm: Form = { type: "text", title: "", message: "", imageUrl: "", linkUrl: "", active: true, startsAt: "", endsAt: "", sortOrder: "0" };

function toInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AnnouncementsManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/saas/announcements").catch(() => null);
    const data: unknown = await response?.json().catch(() => null);
    if (response?.ok && Array.isArray(data)) setItems(data as Announcement[]);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function edit(item: Announcement) {
    setEditingId(item.id);
    setForm({ type: item.type, title: item.title ?? "", message: item.message ?? "", imageUrl: item.imageUrl ?? "", linkUrl: item.linkUrl ?? "", active: item.active, startsAt: toInput(item.startsAt), endsAt: toInput(item.endsAt), sortOrder: String(item.sortOrder) });
    setError("");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "", endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "", sortOrder: Number(form.sortOrder) || 0 };
    const response = await fetch(editingId ? `/api/saas/announcements/${editingId}` : "/api/saas/announcements", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const data: { error?: string } | null = await response?.json().catch(() => null) ?? null;
    setSaving(false);
    if (!response?.ok) { setError(data?.error || "No se pudo guardar el aviso."); return; }
    reset();
    await load();
  }

  async function toggle(item: Announcement) {
    await fetch(`/api/saas/announcements/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, active: !item.active }) });
    await load();
  }

  async function remove(item: Announcement) {
    if (!window.confirm("¿Eliminar este aviso?")) return;
    await fetch(`/api/saas/announcements/${item.id}`, { method: "DELETE" });
    if (editingId === item.id) reset();
    await load();
  }

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold text-dark">Avisos del dashboard de negocios</h2>
      <p className="text-sm text-slate-500">Se muestra un aviso por sesión en el dashboard de cada negocio. Si hay varios activos, se alternan.</p>

      <ul className="mt-4 space-y-3">
        {items.length === 0 && <li className="text-sm text-slate-500">Aún no hay avisos.</li>}
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.type === "image" ? "🖼️ Imagen" : "💬 Texto"}{item.title ? ` · ${item.title}` : ""}</p>
              <p className="truncate text-sm text-slate-600">{item.type === "text" ? item.message : item.imageUrl}</p>
              <p className="text-xs text-slate-400">
                {item.active ? "Activo" : "Inactivo"} · Orden {item.sortOrder}
                {item.startsAt ? ` · Desde ${new Date(item.startsAt).toLocaleDateString("es-MX")}` : ""}
                {item.endsAt ? ` · Hasta ${new Date(item.endsAt).toLocaleDateString("es-MX")}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-sm">
              <button type="button" onClick={() => void toggle(item)} className="rounded border px-3 py-1.5">{item.active ? "Desactivar" : "Activar"}</button>
              <button type="button" onClick={() => edit(item)} className="rounded border px-3 py-1.5">Editar</button>
              <button type="button" onClick={() => void remove(item)} className="rounded border border-red-300 px-3 py-1.5 text-red-600">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 border-t pt-5">
        <h3 className="font-semibold">{editingId ? "Editar aviso" : "Nuevo aviso"}</h3>
        <div className="flex gap-2">
          {(["text", "image"] as const).map((type) => (
            <button key={type} type="button" onClick={() => setForm({ ...form, type })} className={`rounded-full border px-4 py-1.5 text-sm ${form.type === type ? "border-action bg-action/10 font-medium" : ""}`}>{type === "text" ? "Mensaje de texto" : "Imagen"}</button>
          ))}
        </div>
        {form.type === "text" ? (
          <>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} placeholder="Título (opcional)" className="w-full rounded border p-2" />
            <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={500} rows={3} required placeholder="Mensaje" className="w-full rounded border p-2" />
          </>
        ) : (
          <div>
            <p className="mb-2 text-sm text-slate-500">Se muestra en formato panorámico (1600 x 120 px), recortada al centro.</p>
            <ImageDropzone value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} kind="announcement" label="Subir imagen del aviso" className="aspect-1600/120 min-h-28" />
          </div>
        )}
        <input value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} placeholder="Enlace al hacer clic (opcional, / o https://)" className="w-full rounded border p-2" />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Inicia<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1 block w-full rounded border p-2 font-normal" /></label>
          <label className="text-sm font-medium">Termina<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-1 block w-full rounded border p-2 font-normal" /></label>
          <label className="text-sm font-medium">Orden<input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="mt-1 block w-full rounded border p-2 font-normal" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Activo</label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded bg-action px-5 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar aviso"}</button>
          {editingId && <button type="button" onClick={reset} className="rounded border px-5 py-2.5">Cancelar</button>}
        </div>
      </form>
    </section>
  );
}
