"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type ChatMessage = { id: string; sender: string; body: string; createdAt: string };

export default function OrderChat({ endpoint, orderId, self, canSend = true }: { endpoint: string; orderId: string; self: "customer" | "business"; canSend?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`${endpoint}?orderId=${encodeURIComponent(orderId)}`).catch(() => null);
    if (!response?.ok) return;
    const data: unknown = await response.json();
    if (Array.isArray(data)) setMessages(data as ChatMessage[]);
  }, [endpoint, orderId]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 10000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, body }) }).catch(() => null);
    setSending(false);
    if (!response?.ok) {
      const data: { error?: string } | null = await response?.json().catch(() => null) ?? null;
      setError(data?.error || "No se pudo enviar el mensaje.");
      return;
    }
    setText("");
    await load();
  }

  return (
    <div>
      <div className="h-64 space-y-2 overflow-y-auto rounded-xl border bg-slate-50 p-3">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Aún no hay mensajes.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === self ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.sender === self ? "bg-action text-white" : "border bg-white text-dark"}`}>
              <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
              <p className={`mt-1 text-[10px] ${message.sender === self ? "text-white/80" : "text-slate-500"}`}>{new Date(message.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {canSend && (
        <form onSubmit={(event) => void send(event)} className="mt-3 flex gap-2">
          <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Escribe un mensaje" className="min-w-0 flex-1 rounded-full border px-4 py-2" />
          <button type="submit" disabled={sending || !text.trim()} className="rounded-full bg-action px-4 py-2 font-medium text-white disabled:opacity-60">Enviar</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
