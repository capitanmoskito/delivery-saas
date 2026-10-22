"use client";

import Image from "next/image";
import { useState } from "react";

export default function ImageDropzone({ value, onChange, kind, label, className = "aspect-video" }: { value: string; onChange: (url: string) => void; kind: string; label: string; className?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) { setError("Selecciona una imagen."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("La imagen excede 5 MB"); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const response = await fetch("/api/upload", { method: "POST", body: formData }).catch(() => null);
    const data: { success?: boolean; url?: string; message?: string } | null = await response?.json().catch(() => null) ?? null;
    setUploading(false);
    if (!response?.ok || !data?.success || !data.url) { setError(data?.message || "No se pudo subir la imagen."); return; }
    onChange(data.url);
  }

  return (
    <div>
      <label
        className={`relative block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 ${className}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
      >
        <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
        {value ? (
          <>
            <Image src={value} alt={label} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <div className="text-center text-white">
                <p className="font-semibold">Actualizar imagen</p>
                <p className="text-sm">Clic o arrastra una nueva imagen</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-3 text-center">
            <div className="text-4xl">🖼️</div>
            <p className="mt-2 font-semibold">{uploading ? "Subiendo..." : label}</p>
            <p className="text-sm text-slate-500">Arrastra una imagen o haz clic para seleccionarla</p>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG o WEBP · Máx. 5 MB</p>
          </div>
        )}
      </label>
      {uploading && value && <p className="mt-1 text-sm text-slate-500">Subiendo...</p>}
      {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
