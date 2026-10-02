"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import MarketplaceHeader from "@/src/components/marketplace-header";
import { cartUpdatedEvent } from "@/src/hooks/use-cart-count";

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  additionIds: string[];
  additions: Array<{ id: string; name: string; price: number }>;
};
type Cart = {
  restaurantId: string;
  lines: CartLine[];
  pendingOrderId?: string;
  pendingOrderNumber?: string;
  pendingPaymentMethod?: "card" | "transfer";
  pendingPaymentUrl?: string;
};
type TransferDetails = { bankName: string; accountHolder: string; accountNumber: string | null; clabe: string | null; instructions: string | null };
type CheckoutQuote = {
  businessName: string;
  currency: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; totalPrice: number; additions: Array<{ name: string; price: number }> }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  discountCode: string | null;
  appliedPromotions: Array<{ id: string; name: string; discount: number; code?: string }>;
  profileComplete: boolean;
  paymentMethods: { cardProviders: Array<"mercadopago" | "clip">; transferEnabled: boolean; transfer: TransferDetails | null };
};
type CheckoutResponse = {
  error?: string;
  paymentUrl?: string;
  order?: { id: string; orderNumber: string | null; total: number; paymentStatus: string };
  transfer?: TransferDetails | null;
};

const cartKey = "tupedidos_cart";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}

function getLineTotal(item: CheckoutQuote["items"][number] | CartLine) {
  if ("totalPrice" in item) return item.totalPrice;
  const additionsTotal = item.additions.reduce((sum, addition) => sum + addition.price, 0);
  return (item.price + additionsTotal) * item.quantity;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [customerStatus, setCustomerStatus] = useState<"loading" | "active" | "guest">("loading");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [provider, setProvider] = useState<"mercadopago" | "clip">("mercadopago");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [orderCurrency, setOrderCurrency] = useState("MXN");
  const [transferDetails, setTransferDetails] = useState<TransferDetails | null>(null);
  const [pendingPaymentUrl, setPendingPaymentUrl] = useState("");
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<"card" | "transfer" | null>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(cartKey);
      let storedCart: Cart | null = null;
      if (stored) {
        try {
          storedCart = JSON.parse(stored) as Cart;
          setCart(storedCart);
          setOrderNumber(storedCart.pendingOrderNumber || "");
          setPendingPaymentUrl(storedCart.pendingPaymentUrl || "");
          setPendingPaymentMethod(storedCart.pendingPaymentMethod || null);
        } catch {
          window.localStorage.removeItem(cartKey);
        }
      }

      const params = new URLSearchParams(window.location.search);
      const returnedOrderId = params.get("orderId") || storedCart?.pendingOrderId || "";
      setOrderId(returnedOrderId);
      setPaymentId(params.get("payment_id") || params.get("collection_id") || params.get("data.id") || "");
      if (returnedOrderId) setMessage("Estamos confirmando el estado de tu pago...");
      if (params.get("payment") === "failed") setMessage("El pago no se completó. Puedes intentarlo de nuevo o elegir transferencia.");

      fetch("/api/auth/me")
        .then((response) => response.json())
        .then((data: { user?: { role?: string } | null }) => setCustomerStatus(data.user?.role === "customer" ? "active" : "guest"))
        .catch(() => setCustomerStatus("guest"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (customerStatus !== "active" || !cart || !cart.restaurantId || orderId) return;
    const currentCart: Cart = cart;
    let cancelled = false;

    async function loadQuote() {
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: currentCart.restaurantId, items: currentCart.lines, discountCode: appliedCode, paymentMethod }),
        });
        const data: CheckoutQuote & { error?: string } = await response.json();
        if (!response.ok) {
          if (!cancelled) setMessage(data.error || "No se pudo calcular el pedido.");
          return;
        }
        if (cancelled) return;
        setQuote(data);
        setMessage("");
        setDiscountCode(data.discountCode || "");
        if (data.paymentMethods.cardProviders.length === 0 && data.paymentMethods.transferEnabled && paymentMethod !== "transfer") {
          setPaymentMethod("transfer");
        }
        if (!data.paymentMethods.cardProviders.includes(provider) && data.paymentMethods.cardProviders.length > 0) {
          setProvider(data.paymentMethods.cardProviders[0]);
        }
      } catch {
        if (!cancelled) setMessage("No se pudo conectar con el servidor para calcular el pedido.");
      }
    }

    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [customerStatus, cart, appliedCode, paymentMethod, provider, orderId]);

  useEffect(() => {
    if (customerStatus !== "active" || !orderId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    async function checkStatus() {
      try {
        const query = new URLSearchParams({ orderId });
        if (paymentId) query.set("paymentId", paymentId);
        const response = await fetch(`/api/checkout/status?${query.toString()}`);
        const data: { order?: { orderNumber: string | null; total: number; paymentStatus: string; paymentMethod: string }; currency?: string; transfer?: TransferDetails | null; error?: string } = await response.json();
        if (!response.ok || !data.order) return;
        setOrderTotal(data.order.total);
        if (data.currency) setOrderCurrency(data.currency);
        if (data.transfer) setTransferDetails(data.transfer);
        setOrderNumber(data.order.orderNumber || orderId);
        if (data.order.paymentStatus === "paid") {
          window.localStorage.removeItem(cartKey);
          window.dispatchEvent(new Event(cartUpdatedEvent));
          setCart(null);
          setPaid(true);
          setTransferDetails(null);
          setMessage(`Pago confirmado. Pedido ${data.order.orderNumber || orderId}.`);
          return;
        }
        if (attempts < 12 && !cancelled) {
          attempts += 1;
          timer = window.setTimeout(() => void checkStatus(), 5000);
        }
      } catch {
        if (!cancelled && attempts < 12) {
          attempts += 1;
          timer = window.setTimeout(() => void checkStatus(), 5000);
        }
      }
    }

    void checkStatus();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [customerStatus, orderId, paymentId]);

  async function applyDiscountCode() {
    setAppliedCode(discountCode.trim().toUpperCase());
    setMessage("");
  }

  async function placeOrder() {
    if (!cart || !quote || !quote.profileComplete) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: cart.restaurantId,
          items: cart.lines,
          discountCode: quote.discountCode || "",
          paymentMethod,
          provider: paymentMethod === "card" ? provider : undefined,
        }),
      });
      const data: CheckoutResponse = await response.json();
      if (!response.ok || !data.order) {
        setMessage(data.error || "No se pudo iniciar el pedido.");
        return;
      }

      setOrderId(data.order.id);
      setOrderNumber(data.order.orderNumber || data.order.id);
      setOrderTotal(data.order.total);
      setPendingPaymentMethod(paymentMethod);
      setPendingPaymentUrl(data.paymentUrl || "");
      const pendingCart: Cart = {
        ...cart,
        pendingOrderId: data.order.id,
        pendingOrderNumber: data.order.orderNumber || data.order.id,
        pendingPaymentMethod: paymentMethod,
        ...(data.paymentUrl ? { pendingPaymentUrl: data.paymentUrl } : {}),
      };
      window.localStorage.setItem(cartKey, JSON.stringify(pendingCart));
      setCart(pendingCart);
      if (paymentMethod === "transfer") {
        setTransferDetails(data.transfer || quote.paymentMethods.transfer);
        setMessage("Pedido creado. Realiza la transferencia y espera la confirmación del negocio.");
      } else if (data.paymentUrl) {
        window.location.assign(data.paymentUrl);
      } else {
        setMessage("No se recibió el enlace de pago. El pedido permanece pendiente.");
      }
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <MarketplaceHeader />
      <main className="mx-auto max-w-6xl p-6">
        <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-dark">
          <ChevronLeft size={18} /> Regresar
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Finalizar compra</h1>

        {customerStatus === "loading" ? (
          <p className="mt-6 text-slate-600">Verificando tu cuenta...</p>
        ) : customerStatus === "guest" ? (
          <section className="mt-6 max-w-xl space-y-4 rounded border p-5">
            <p>Inicia sesión con tu cuenta de cliente para revisar el total y pagar el pedido.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login?callbackUrl=%2Fcheckout" className="rounded bg-action px-5 py-3 text-white">Iniciar sesión</Link>
              <Link href="/customer/register" className="rounded border px-5 py-3">Crear cuenta</Link>
            </div>
          </section>
        ) : !cart?.lines.length && !orderId ? (
          <p className="mt-6 text-slate-600">Tu carrito está vacío.</p>
        ) : (
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
            <section className="space-y-6">
              {!paid && quote?.profileComplete === false && (
                <div className="rounded border border-amber-300 bg-amber-50 p-4">
                  <p className="font-medium">Completa tu perfil y dirección para continuar.</p>
                  <Link href="/customer/profile" className="mt-2 inline-block font-semibold text-action underline">Ir a mi perfil</Link>
                </div>
              )}

              {cart?.lines.length ? (
                <section className="rounded border p-5">
                  <h2 className="text-xl font-semibold">{quote?.businessName || "Tu negocio"}</h2>
                  <div className="mt-4 divide-y">
                    {(quote?.items || cart.lines).map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex justify-between gap-4 py-3">
                        <div>
                          <p className="font-medium">{item.quantity} × {item.name}</p>
                          {item.additions.length > 0 && <p className="text-sm text-slate-500">{item.additions.map((addition) => addition.name).join(", ")}</p>}
                        </div>
                        <span className="shrink-0">{formatMoney(getLineTotal(item), quote?.currency || "MXN")}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {quote && !paid && !orderId && (
                <section className="rounded border p-5">
                  <h2 className="text-xl font-semibold">Forma de pago</h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {quote.paymentMethods.cardProviders.length > 0 && (
                      <label className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-3 ${paymentMethod === "card" ? "border-action" : "border-border"}`}>
                        <input type="radio" name="paymentMethod" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} /> Tarjeta
                      </label>
                    )}
                    {quote.paymentMethods.transferEnabled && (
                      <label className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-3 ${paymentMethod === "transfer" ? "border-action" : "border-border"}`}>
                        <input type="radio" name="paymentMethod" checked={paymentMethod === "transfer"} onChange={() => setPaymentMethod("transfer")} /> Transferencia
                      </label>
                    )}
                  </div>

                  {paymentMethod === "card" && quote.paymentMethods.cardProviders.length > 1 && (
                    <fieldset className="mt-4 flex flex-wrap gap-4">
                      <legend className="mb-2 text-sm font-medium">Pasarela</legend>
                      {quote.paymentMethods.cardProviders.map((availableProvider) => (
                        <label key={availableProvider} className="flex cursor-pointer items-center gap-2">
                          <input type="radio" name="provider" checked={provider === availableProvider} onChange={() => setProvider(availableProvider)} />
                          {availableProvider === "mercadopago" ? "Mercado Pago" : "Clip"}
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {paymentMethod === "transfer" && (transferDetails || quote.paymentMethods.transfer) && (
                    <div className="mt-5 space-y-2 rounded bg-slate-50 p-4 text-sm">
                      <h3 className="font-semibold">Datos para transferir</h3>
                      <p>Banco: {(transferDetails || quote.paymentMethods.transfer)?.bankName}</p>
                      <p>Titular: {(transferDetails || quote.paymentMethods.transfer)?.accountHolder}</p>
                      {(transferDetails || quote.paymentMethods.transfer)?.clabe && <p>CLABE: {(transferDetails || quote.paymentMethods.transfer)?.clabe}</p>}
                      {(transferDetails || quote.paymentMethods.transfer)?.accountNumber && <p>Número de cuenta: {(transferDetails || quote.paymentMethods.transfer)?.accountNumber}</p>}
                      {(transferDetails || quote.paymentMethods.transfer)?.instructions && <p className="pt-2">{(transferDetails || quote.paymentMethods.transfer)?.instructions}</p>}
                      {orderNumber && <p className="pt-2 font-medium">Referencia del pedido: {orderNumber}</p>}
                      <p className="pt-2 text-slate-600">El pedido quedará pendiente hasta que el negocio confirme el pago.</p>
                    </div>
                  )}
                </section>
              )}

              {orderId && transferDetails && !paid && (
                <section className="space-y-2 rounded border p-5">
                  <h2 className="text-xl font-semibold">Transferencia pendiente</h2>
                  <p>Banco: {transferDetails.bankName}</p>
                  <p>Titular: {transferDetails.accountHolder}</p>
                  {transferDetails.clabe && <p>CLABE: {transferDetails.clabe}</p>}
                  {transferDetails.accountNumber && <p>Número de cuenta: {transferDetails.accountNumber}</p>}
                  {transferDetails.instructions && <p>{transferDetails.instructions}</p>}
                  {orderNumber && <p className="font-medium">Referencia: {orderNumber}</p>}
                  {orderTotal !== null && <p className="font-semibold">Total a transferir: {formatMoney(orderTotal, quote?.currency || "MXN")}</p>}
                  <p className="text-sm text-slate-600">El pedido se liberará cuando el negocio confirme la recepción.</p>
                </section>
              )}

              {quote && !paid && !orderId && (
                <section className="rounded border p-5">
                  <h2 className="text-lg font-semibold">Código de descuento</h2>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="Ingresa tu código" className="min-w-0 flex-1 border p-3" />
                    <button type="button" disabled={!discountCode.trim()} onClick={() => void applyDiscountCode()} className="rounded border px-4 py-3 disabled:text-slate-400">Aplicar</button>
                  </div>
                  {quote.discountCode && <button type="button" onClick={() => { setDiscountCode(""); setAppliedCode(""); }} className="mt-3 text-sm text-action underline">Quitar código {quote.discountCode}</button>}
                </section>
              )}

              {message && <p role="status" className="rounded border p-4">{message}</p>}
              {orderId && pendingPaymentMethod === "card" && pendingPaymentUrl && !paid && (
                <a href={pendingPaymentUrl} className="inline-flex rounded bg-action px-5 py-3 font-semibold text-white">
                  Continuar al pago con tarjeta
                </a>
              )}
              {quote && !paid && !orderId && (quote.paymentMethods.cardProviders.length > 0 || quote.paymentMethods.transferEnabled) && (
                <button type="button" disabled={loading || !quote.profileComplete} onClick={() => void placeOrder()} className="w-full rounded bg-action px-5 py-3 font-semibold text-white disabled:bg-gray-400 sm:w-auto">
                  {loading ? "Procesando..." : paymentMethod === "transfer" ? "Generar pedido" : `Pagar ${formatMoney(quote.total, quote.currency)}`}
                </button>
              )}
              {quote && quote.paymentMethods.cardProviders.length === 0 && !quote.paymentMethods.transferEnabled && (
                <p className="rounded border p-4 text-sm text-slate-600">Este negocio aún no configuró una forma de pago.</p>
              )}
            </section>

            {quote && (
              <aside className="rounded border p-5 lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold">Resumen</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal, quote.currency)}</dd></div>
                  {quote.appliedPromotions.map((promotion) => (
                    <div key={promotion.id} className="flex justify-between gap-4 text-green-700"><dt>{promotion.code ? `Código ${promotion.code}` : promotion.name}</dt><dd>−{formatMoney(promotion.discount, quote.currency)}</dd></div>
                  ))}
                  <div className="flex justify-between gap-4 border-t pt-3 font-semibold text-dark"><dt>Total</dt><dd>{formatMoney(quote.total, quote.currency)}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-slate-500">El total se confirma nuevamente al crear el pedido.</p>
              </aside>
            )}
            {!quote && orderId && orderTotal !== null && (
              <aside className="rounded border p-5 lg:sticky lg:top-24">
                <h2 className="text-xl font-semibold">Pedido {orderNumber}</h2>
                <p className="mt-4 flex justify-between gap-4 font-semibold"><span>Total</span><span>{formatMoney(orderTotal, orderCurrency)}</span></p>
                <p className="mt-3 text-sm text-slate-600">Estado: {paid ? "Pagado" : "Pendiente de confirmación"}</p>
              </aside>
            )}
          </div>
        )}
      </main>
    </>
  );
}