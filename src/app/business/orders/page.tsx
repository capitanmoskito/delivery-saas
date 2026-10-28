"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, Minus, Plus } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { playChime } from "@/src/lib/alert-sound";
import OrderChat from "@/src/components/order-chat";
import AddressFields, { type AddressValue } from "@/src/components/location/address-fields";

type Variant = { id: string; name: string; price: number };
type Product = { id: string; name: string; price: number; imageUrl?: string | null; variants: Variant[] };
type PackageComplement = { id: string; name: string; price: number };
type Package = { id: string; name: string; price: number; imageUrl?: string | null; complements: PackageComplement[]; items: Array<{ productId: string; quantity: number }> };
type Promotion = { id: string; name: string; discountType?: "percentage" | "fixed_amount" | null; discountPercent?: number | null; discountAmount?: number | null; appliesToLocalOrders: boolean; appliesToCash: boolean; appliesToCard: boolean; targetProducts: Array<{ productId: string }>; requiredProducts: Array<{ productId: string; quantity: number }> };
type OrderStatus = "pending_payment" | "accepted" | "preparing" | "ready_pickup" | "ready_delivery" | "delivered";
type Order = { customerMessageCount?: number; deliveryConfirmation?: string | null; deliveredToName?: string | null; deliveryCode?: { code: string; activeCode: string | null; expiresAt: string } | null; id: string; orderNumber?: string | null; source: "online" | "local"; fulfillmentType: "pickup" | "delivery" | "dine_in"; paymentStatus: "paid" | "pending"; paymentMethod: string; customerName?: string | null; tableNumber?: string | null; deliveryAddress?: string | null; postalCode?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; deliveryReference?: string | null; contactPhone?: string | null; latitude?: number | null; longitude?: number | null; acceptedAt?: string | null; preparingAt?: string | null; readyAt?: string | null; paidAt?: string | null; createdAt: string; updatedAt?: string | null; status: OrderStatus; total: number; customer: { firstName: string; lastName: string }; items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number; product: { name: string }; additions?: unknown }> };
type DraftItem = { productId: string; name: string; quantity: number; additionIds: string[]; additions: Variant[]; total: number };
type Closure = { orderCount: number; totalAmount: number; onlineOrderCount: number; localOrderCount: number; summary: { busiestHours: Array<{ hour: number; orderCount: number }>; starDishes: Array<{ name: string; quantity: number }>; recurringCustomers: Array<{ name: string; orders: number }> } };

const SEEN_MESSAGES_KEY = "orders-seen-message-counts";

function readSeenCounts(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SEEN_MESSAGES_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function playAlarm(context: AudioContext) {
  [660, 440, 660, 440, 660, 440].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * 0.25;
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  });
}

function isClosedOrder(order: Order) {
  return order.status === "delivered" && order.deliveryConfirmation !== "disputed" && (order.source === "online" || order.paymentStatus === "paid");
}

function isNotifiable(order: Order) {
  return order.source === "online" && !(order.status === "pending_payment" && order.paymentMethod !== "transfer");
}

const statusLabels: Record<OrderStatus, string> = { pending_payment: "Pago pendiente", accepted: "Orden aceptada", preparing: "En preparación", ready_pickup: "Lista para recoger", ready_delivery: "Lista para envío", delivered: "Entregada" };
const emptyDeliveryAddress: AddressValue = { street: "", postalCode: "", neighborhood: "", city: "", state: "", country: "México", reference: "", contactPhone: "", latitude: null, longitude: null };

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [codeOrderId, setCodeOrderId] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery" | "dine_in">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState<AddressValue>(emptyDeliveryAddress);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [additionIds, setAdditionIds] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [packageSelections, setPackageSelections] = useState<Array<{ packageId: string; name: string; price: number; quantity: number; complementIds: string[]; complements: PackageComplement[] }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageComplementIds, setPackageComplementIds] = useState<string[]>([]);
  const [packageQuantity, setPackageQuantity] = useState(1);
  const [promotionIds, setPromotionIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closure, setClosure] = useState<Closure | null>(null);
  const [error, setError] = useState("");
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const messageCountsRef = useRef<Map<string, number> | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  function seedKnown(list: Order[]) {
    const known = knownIdsRef.current ?? new Set<string>();
    list.filter((order) => !isNotifiable(order) || knownIdsRef.current === null).forEach((order) => { if (isNotifiable(order)) known.add(order.id); });
    knownIdsRef.current = known;
  }

  function ensureAudio() {
    if (!audioRef.current && typeof window !== "undefined" && "AudioContext" in window) audioRef.current = new AudioContext();
    if (audioRef.current?.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }

  async function loadData() {
    const [productsResponse, ordersResponse] = await Promise.all([fetch("/api/products"), fetch("/api/orders")]);
    const productsData: unknown = await productsResponse.json();
    const ordersData: unknown = await ordersResponse.json();
    if (!productsResponse.ok || !Array.isArray(productsData)) { setError("No se pudieron cargar los productos"); return; }
    if (!ordersResponse.ok || !Array.isArray(ordersData)) { setError("No se pudieron cargar los pedidos"); return; }
    setProducts(productsData as Product[]);
    seedKnown(ordersData as Order[]);
    setOrders(ordersData as Order[]);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [productsResponse, ordersResponse] = await Promise.all([fetch("/api/products"), fetch("/api/orders")]);
        const productsData: unknown = await productsResponse.json();
        const ordersData: unknown = await ordersResponse.json();

        if (!active) {
          return;
        }

        if (!productsResponse.ok || !Array.isArray(productsData)) {
          setError("No se pudieron cargar los productos");
          return;
        }

        if (!ordersResponse.ok || !Array.isArray(ordersData)) {
          setError("No se pudieron cargar los pedidos");
          return;
        }

        setProducts(productsData as Product[]);
        seedKnown(ordersData as Order[]);
        messageCountsRef.current = new Map((ordersData as Order[]).map((order) => [order.id, order.customerMessageCount ?? 0]));
        setSeenCounts(readSeenCounts());
        setOrders(ordersData as Order[]);
      } catch {
        if (active) {
          setError("No se pudo conectar con el servidor");
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (newOrderIds.length === 0) return;

    const context = ensureAudio();
    if (!context) return;

    playChime(context);
    const timer = window.setInterval(() => playChime(context), 1200);
    return () => window.clearInterval(timer);
  }, [newOrderIds.length]);

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function pollOrders() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        const data: unknown = await response.json();
        if (!active || !response.ok || !Array.isArray(data)) return;
        const list = data as Order[];
        const known = knownIdsRef.current;
        if (known) {
          const fresh = list.filter((order) => isNotifiable(order) && !known.has(order.id));
          if (fresh.length > 0) {
            fresh.forEach((order) => known.add(order.id));
            setNewOrderIds((current) => [...current, ...fresh.map((order) => order.id)]);
          }
        } else {
          seedKnown(list);
        }
        const previous = messageCountsRef.current;
        const current = new Map(list.map((order) => [order.id, order.customerMessageCount ?? 0]));
        if (previous && list.some((order) => (order.customerMessageCount ?? 0) > (previous.get(order.id) ?? 0)) && audioRef.current) playAlarm(audioRef.current);
        messageCountsRef.current = current;
        setOrders(list);
      } catch {
        // Next poll retries silently.
      } finally {
        inFlight = false;
      }
    }

    const unlockAudio = () => { ensureAudio(); };
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    const timer = window.setInterval(() => void pollOrders(), 8000);
    const onVisible = () => void pollOrders();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const unreadMessageOrders = orders.filter((order) => order.id !== disputeOrderId && (order.customerMessageCount ?? 0) > (seenCounts[order.id] ?? 0));

  function markMessagesSeen(order: Order) {
    const next = { ...readSeenCounts(), [order.id]: order.customerMessageCount ?? 0 };
    window.localStorage.setItem(SEEN_MESSAGES_KEY, JSON.stringify(next));
    setSeenCounts(next);
  }

  function openDispute(orderId: string) {
    const order = orders.find((item) => item.id === orderId);
    if (order) markMessagesSeen(order);
    setDisputeOrderId(orderId);
  }

  function closeDispute() {
    const order = orders.find((item) => item.id === disputeOrderId);
    if (order) markMessagesSeen(order);
    setDisputeOrderId(null);
  }

  useEffect(() => {
    if (unreadMessageOrders.length === 0) return;
    const original = document.title;
    let on = true;
    const timer = window.setInterval(() => {
      document.title = on ? "🔴 Mensaje de cliente" : original;
      on = !on;
    }, 1000);
    return () => { window.clearInterval(timer); document.title = original; };
  }, [unreadMessageOrders.length]);

  useEffect(() => {
    if (newOrderIds.length === 0) return;
    const original = document.title;
    let on = true;
    const timer = window.setInterval(() => {
      document.title = on ? `🔔 (${newOrderIds.length}) Nuevo pedido` : original;
      on = !on;
    }, 1000);
    return () => { window.clearInterval(timer); document.title = original; };
  }, [newOrderIds.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    const initialTimer = window.setTimeout(() => setCurrentTime(Date.now()), 0);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(initialTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadExtras() {
      const [packagesResponse, promotionsResponse] = await Promise.all([fetch("/api/packages"), fetch("/api/promotions")]);
      const packagesData: unknown = await packagesResponse.json();
      const promotionsData: unknown = await promotionsResponse.json();
      if (active && packagesResponse.ok && Array.isArray(packagesData)) setPackages(packagesData as Package[]);
      if (active && promotionsResponse.ok && Array.isArray(promotionsData)) setPromotions(promotionsData as Promotion[]);
    }

    void loadExtras();
    return () => { active = false; };
  }, []);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedPackage = packages.find((item) => item.id === selectedPackageId);
  const formSubtotal = items.reduce((total, item) => total + item.total, 0) + packageSelections.reduce((total, item) => total + (item.price + item.complements.reduce((complementTotal, complement) => complementTotal + complement.price, 0)) * item.quantity, 0);
  const orderQuantities = new Map<string, number>();
  for (const item of items) orderQuantities.set(item.productId, (orderQuantities.get(item.productId) || 0) + item.quantity);
  for (const selection of packageSelections) {
    const selected = packages.find((item) => item.id === selection.packageId);
    for (const packageItem of selected?.items || []) orderQuantities.set(packageItem.productId, (orderQuantities.get(packageItem.productId) || 0) + packageItem.quantity * selection.quantity);
  }
  const promotionDiscount = Math.min(formSubtotal, promotions.filter((promotion) => promotionIds.includes(promotion.id)).reduce((total, promotion) => {
    const requirementsMet = promotion.requiredProducts.every((item) => (orderQuantities.get(item.productId) || 0) >= item.quantity);
    if (!requirementsMet) return total;
    const targetSubtotal = promotion.targetProducts.reduce((targetTotal, target) => targetTotal + (products.find((product) => product.id === target.productId)?.price || 0) * (orderQuantities.get(target.productId) || 0), 0);
    const discount = promotion.discountType === "percentage" ? targetSubtotal * ((promotion.discountPercent || 0) / 100) : promotion.discountType === "fixed_amount" ? Math.min(targetSubtotal, promotion.discountAmount || 0) : 0;
    return total + discount;
  }, 0));
  const formTotal = Math.max(0, formSubtotal - promotionDiscount);

  function resetLine() { setSelectedProductId(""); setQuantity(1); setAdditionIds([]); }
  function resetOrder() { setCustomerName(""); setTableNumber(""); setFulfillmentType("pickup"); setDeliveryLocation(emptyDeliveryAddress); setItems([]); setPackageSelections([]); setSelectedPackageId(""); setPackageComplementIds([]); setPackageQuantity(1); setPromotionIds([]); resetLine(); setEditingOrderId(null); setShowForm(false); setError(""); }

  function editOrder(order: Order) {
    setCustomerName(order.customerName || "");
    setTableNumber(order.tableNumber || "");
    setFulfillmentType(order.fulfillmentType);
    setDeliveryLocation({ street: order.deliveryAddress || "", postalCode: order.postalCode || "", neighborhood: order.neighborhood || "", city: order.city || "", state: order.state || "", country: "México", reference: order.deliveryReference || "", contactPhone: order.contactPhone || "", latitude: order.latitude || null, longitude: order.longitude || null });
    setItems(order.items.map((item) => {
      const additions = Array.isArray(item.additions) ? item.additions.filter(isVariant) : [];
      return { productId: item.productId, name: item.product.name, quantity: item.quantity, additionIds: additions.map((addition) => addition.id), additions, total: item.totalPrice };
    }));
    setEditingOrderId(order.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addProductToOrder() {
    if (!selectedProduct) { setError("Selecciona un producto"); return; }
    const itemQuantity = quantity;
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) { setError("La cantidad debe ser mayor a cero"); return; }
    const additions = selectedProduct.variants.filter((variant) => additionIds.includes(variant.id));
    const unitPrice = selectedProduct.price + additions.reduce((total, addition) => total + addition.price, 0);
    setItems((current) => [...current, { productId: selectedProduct.id, name: selectedProduct.name, quantity: itemQuantity, additionIds, additions, total: unitPrice * itemQuantity }]);
    setError("");
    resetLine();
  }

  function addPackageToOrder() {
    if (!selectedPackage) { setError("Selecciona un paquete"); return; }
    const itemQuantity = packageQuantity;
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) { setError("La cantidad debe ser mayor a cero"); return; }
    const complements = selectedPackage.complements.filter((complement) => packageComplementIds.includes(complement.id));
    setPackageSelections((current) => [...current, { packageId: selectedPackage.id, name: selectedPackage.name, price: selectedPackage.price, quantity: itemQuantity, complementIds: packageComplementIds, complements }]);
    setSelectedPackageId(""); setPackageComplementIds([]); setPackageQuantity(1); setError("");
  }

  async function createOrder() {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/orders", { method: editingOrderId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingOrderId, source: "local", customerName, tableNumber, fulfillmentType, paymentMethod: "cash", promotionIds, packages: packageSelections.map(({ packageId, quantity: itemQuantity, complementIds }) => ({ packageId, quantity: itemQuantity, complementIds })), deliveryAddress: deliveryLocation.street, postalCode: deliveryLocation.postalCode, neighborhood: deliveryLocation.neighborhood, city: deliveryLocation.city, state: deliveryLocation.state, deliveryReference: deliveryLocation.reference, contactPhone: deliveryLocation.contactPhone, latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude, items: items.map(({ productId, quantity: itemQuantity, additionIds: itemAdditionIds }) => ({ productId, quantity: itemQuantity, additionIds: itemAdditionIds })) }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo crear la orden"); return; }
      resetOrder(); await loadData();
    } catch { setError("No se pudo conectar con el servidor"); } finally { setSaving(false); }
  }

  const codeOrder = orders.find((order) => order.id === codeOrderId && order.deliveryCode?.activeCode) ?? null;

  async function updateOrder(orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") {
    setError("");
    try {
      const response = await fetch("/api/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: orderId, status, paymentStatus }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo actualizar el pedido"); return; }
      await loadData();
      if (status === "ready_delivery") { setConfirmingClose(false); setCodeOrderId(orderId); }
    } catch { setError("No se pudo conectar con el servidor"); }
  }

  async function closeDay() {
    setClosing(true); setError("");
    try {
      const response = await fetch("/api/orders/close-day", { method: "POST" });
      const data: Closure & { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo cerrar la jornada"); return; }
      setClosure(data);
    } catch { setError("No se pudo conectar con el servidor"); } finally { setClosing(false); }
  }

  return <div>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h1 className="text-3xl font-bold">Pedidos</h1><div className="flex gap-2"><button type="button" onClick={closeDay} disabled={closing} className="rounded border px-4 py-2 disabled:bg-gray-100">{closing ? "Cerrando..." : "Cierre de día"}</button><button type="button" onClick={() => setShowForm(true)} className="rounded bg-action px-4 py-2 text-white">Crear orden</button></div></div>
    {showForm && <section className="mt-6 space-y-5 rounded border p-4"><h2 className="text-xl font-semibold">{editingOrderId ? "Editar orden en local" : "Nueva orden en local"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="border p-2" placeholder="Nombre del cliente" /><input value={tableNumber} disabled={fulfillmentType !== "dine_in"} onChange={(event) => setTableNumber(event.target.value)} className="border p-2 disabled:cursor-not-allowed disabled:bg-slate-100" placeholder={fulfillmentType === "dine_in" ? "Mesa" : "Mesa disponible para consumo en local"} /></div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Opción de entrega</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setFulfillmentType("pickup")} className={`rounded border p-3 text-left ${fulfillmentType === "pickup" ? "border-action bg-action/10" : "bg-white"}`}><span className="block font-medium">Para recoger</span><span className="text-sm text-slate-500">El cliente recoge su pedido.</span></button>
          <button type="button" onClick={() => setFulfillmentType("delivery")} className={`rounded border p-3 text-left ${fulfillmentType === "delivery" ? "border-action bg-action/10" : "bg-white"}`}><span className="block font-medium">Para envío</span><span className="text-sm text-slate-500">Requiere dirección de entrega.</span></button>
          <button type="button" onClick={() => setFulfillmentType("dine_in")} className={`rounded border p-3 text-left ${fulfillmentType === "dine_in" ? "border-action bg-action/10" : "bg-white"}`}><span className="block font-medium">Consumo en local</span><span className="text-sm text-slate-500">Se sirve en mesa.</span></button>
        </div>
        {fulfillmentType === "delivery" && <AddressFields value={deliveryLocation} onChange={setDeliveryLocation} />}
      </div>
      <div className="rounded border p-4"><h3 className="font-semibold">Promociones aplicables manualmente</h3><div className="mt-3 space-y-2">{promotions.filter((promotion) => promotion.appliesToLocalOrders && promotion.appliesToCash).map((promotion) => <label key={promotion.id} className="flex items-center gap-2 rounded border p-2"><input type="checkbox" checked={promotionIds.includes(promotion.id)} onChange={(event) => setPromotionIds((current) => event.target.checked ? [...current, promotion.id] : current.filter((id) => id !== promotion.id))} /><span>{promotion.name}</span><span className="text-sm text-slate-500">{promotion.discountType === "percentage" ? `${promotion.discountPercent || 0}%` : promotion.discountType === "fixed_amount" ? `$${(promotion.discountAmount || 0).toFixed(2)}` : "Regalo"}</span></label>)}{promotions.length === 0 && <p className="text-sm text-slate-500">No hay promociones disponibles.</p>}</div></div>
      <div className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">Agregar producto</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => <button key={product.id} type="button" onClick={() => { setSelectedProductId(product.id); setAdditionIds([]); }} className={`overflow-hidden rounded border text-left ${selectedProductId === product.id ? "border-action ring-2 ring-action/30" : "bg-white"}`}><div className="relative aspect-square w-full bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin imagen</div>}</div><div className="p-2"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-sm text-slate-500">${product.price.toFixed(2)}</p></div></button>)}
        </div>
        {selectedProduct && selectedProduct.variants.length > 0 && <div><p className="mb-2 text-sm font-medium">Adicionales</p><div className="grid gap-2 sm:grid-cols-2">{selectedProduct.variants.map((variant) => <label key={variant.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={additionIds.includes(variant.id)} onChange={(event) => setAdditionIds((current) => event.target.checked ? [...current, variant.id] : current.filter((id) => id !== variant.id))} />{variant.name}{variant.price > 0 ? ` (+$${variant.price.toFixed(2)})` : ""}</label>)}</div></div>}
        {selectedProduct && <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><QuantitySelector value={quantity} onChange={setQuantity} /><button type="button" onClick={addProductToOrder} className="min-h-12 rounded border bg-action px-4 py-2 font-medium text-white">Guardar producto</button></div>}</div>
      <div className="rounded border p-4"><h3 className="font-semibold">Agregar paquete</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{packages.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedPackageId(item.id); setPackageComplementIds([]); }} className={`overflow-hidden rounded border text-left ${selectedPackageId === item.id ? "border-action ring-2 ring-action/30" : "bg-white"}`}><div className="relative aspect-square bg-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin imagen</div>}</div><div className="p-2"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-sm text-slate-500">${item.price.toFixed(2)}</p></div></button>)}</div>{selectedPackage && <div className="mt-4 space-y-3 border-t pt-4"><p className="font-medium">Complementos de {selectedPackage.name}</p>{selectedPackage.complements.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{selectedPackage.complements.map((complement) => <label key={complement.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={packageComplementIds.includes(complement.id)} onChange={(event) => setPackageComplementIds((current) => event.target.checked ? [...current, complement.id] : current.filter((id) => id !== complement.id))} />{complement.name}{complement.price > 0 ? ` (+$${complement.price.toFixed(2)})` : ""}</label>)}</div> : <p className="text-sm text-slate-500">Este paquete no tiene complementos.</p>}<div className="flex flex-col gap-3 sm:flex-row sm:items-end"><QuantitySelector value={packageQuantity} onChange={setPackageQuantity} /><button type="button" onClick={addPackageToOrder} className="min-h-12 rounded bg-action px-4 py-2 font-medium text-white">Agregar paquete</button></div></div>}</div>
      {packageSelections.length > 0 && <div className="rounded border p-4"><h3 className="font-semibold">Paquetes de la orden</h3>{packageSelections.map((item, index) => <div key={`${item.packageId}-${index}`} className="mt-2 flex justify-between gap-3 text-sm"><div><p>{item.quantity}x {item.name}</p>{item.complements.length > 0 && <p className="text-slate-500">{item.complements.map((complement) => complement.name).join(", ")}</p>}</div><div className="flex items-center gap-3"><span className="font-medium">${((item.price + item.complements.reduce((total, complement) => total + complement.price, 0)) * item.quantity).toFixed(2)}</span><button type="button" onClick={() => setPackageSelections((current) => current.filter((_, selectionIndex) => selectionIndex !== index))} className="text-red-600">Quitar</button></div></div>)}</div>}
      {(items.length > 0 || packageSelections.length > 0) && <div className="rounded border p-4"><h3 className="font-semibold">Productos de la orden</h3><div className="mt-3 space-y-2">{items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-start justify-between gap-3 border-b pb-2 text-sm"><div><p>{item.quantity}x {item.name}</p>{item.additions.length > 0 && <p className="text-slate-500">{item.additions.map((addition) => addition.name).join(", ")}</p>}</div><div className="flex items-center gap-3"><span>${item.total.toFixed(2)}</span><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600">Quitar</button></div></div>)}</div><div className="mt-3 space-y-1 text-right"><p>Subtotal: ${formSubtotal.toFixed(2)}</p>{promotionDiscount > 0 && <p className="text-action">Promociones: -${promotionDiscount.toFixed(2)}</p>}<p className="font-semibold">Monto: ${formTotal.toFixed(2)}</p></div></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}<div><button type="button" onClick={createOrder} disabled={saving || (items.length === 0 && packageSelections.length === 0)} className="rounded bg-action px-4 py-2 text-white disabled:bg-gray-400">{saving ? "Guardando..." : editingOrderId ? "Guardar cambios" : "Guardar orden completa"}</button><button type="button" onClick={resetOrder} className="ml-2 rounded border px-4 py-2">Cancelar</button></div></section>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {newOrderIds.length > 0 ? (
        <div role="alert" className="flex flex-1 items-center justify-between gap-3 rounded-xl border-2 border-action bg-action/10 px-4 py-3 text-dark animate-pulse">
          <span className="flex items-center gap-2 font-semibold"><Bell size={20} className="text-action" /> {newOrderIds.length === 1 ? "Llegó 1 pedido nuevo" : `Llegaron ${newOrderIds.length} pedidos nuevos`}</span>
          <button type="button" onClick={() => setNewOrderIds([])} className="rounded-full bg-action px-4 py-1.5 text-sm font-medium text-white">Entendido</button>
        </div>
      ) : <span />}
    </div>
    {unreadMessageOrders.length > 0 && (
      <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 px-4 py-3 text-red-700 animate-pulse">
        <span className="flex items-center gap-2 font-semibold"><AlertTriangle size={20} className="text-red-600" /> Ups, tienes un mensaje de un cliente, revísalo lo antes posible.</span>
        <button type="button" onClick={() => openDispute(unreadMessageOrders[0].id)} className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white">Ver mensaje</button>
      </div>
    )}
    {error && !showForm && <p className="mt-4 text-sm text-red-600">{error}</p>}{closure && <ClosureSummary closure={closure} onClose={() => setClosure(null)} />}
    <OrdersTable title="Pedidos en línea" highlightIds={newOrderIds} orders={orders.filter((order) => order.source === "online")} onDispute={openDispute} unreadMessageIds={unreadMessageOrders.map((order) => order.id)} onUpdate={updateOrder} onView={(order) => setViewOrderId(order.id)} currentTime={currentTime} /><OrdersTable title="Pedidos en local" orders={orders.filter((order) => order.source === "local")} onUpdate={updateOrder} onEdit={editOrder} currentTime={currentTime} />
    {viewOrderId && orders.find((order) => order.id === viewOrderId) && <OrderDetailModal order={orders.find((order) => order.id === viewOrderId) as Order} onClose={() => setViewOrderId(null)} />}
    {codeOrder && <DeliveryCodeModal order={codeOrder} confirming={confirmingClose} onAskClose={() => setConfirmingClose(true)} onKeepOpen={() => setConfirmingClose(false)} onClose={() => { setConfirmingClose(false); setCodeOrderId(null); }} />}
    {disputeOrderId && orders.some((order) => order.id === disputeOrderId && order.deliveryConfirmation === "disputed") && (
      <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center">
        <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={22} />
              <p className="font-bold text-dark">El cliente menciona que no le entregaron. Contáctalo con tu repartidor y aclara el caso por mensaje.</p>
            </div>
            <button type="button" onClick={closeDispute} className="text-slate-500">Cerrar</button>
          </div>
          <div className="mt-4"><OrderChat endpoint="/api/orders/messages" orderId={disputeOrderId} self="business" /></div>
        </div>
      </div>
    )}
    <DeliveryCodesPanel orders={orders.filter((order) => order.status === "ready_delivery" && order.deliveryCode?.activeCode)} />
    <PendingTransferQueue orders={orders.filter((order) => order.source === "online" && order.paymentMethod === "transfer" && order.paymentStatus === "pending")} onConfirm={(orderId) => void updateOrder(orderId, "accepted", "paid")} />
  </div>;
}

function QuantitySelector({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">Cantidad</p>
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="Quitar una unidad"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-md text-dark transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <output aria-live="polite" aria-label="Cantidad seleccionada" className="min-w-10 text-center text-lg font-semibold tabular-nums text-dark">
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label="Agregar una unidad"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-md bg-action text-white transition-colors hover:bg-action/90"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function OrdersTable({ title, orders: allOrders, highlightIds = [], unreadMessageIds = [], onDispute, onUpdate, onEdit, onView, currentTime }: { title: string; orders: Order[]; highlightIds?: string[]; unreadMessageIds?: string[]; onDispute?: (orderId: string) => void; onUpdate: (orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") => void; onEdit?: (order: Order) => void; onView?: (order: Order) => void; currentTime: number | null }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null);
  const history = allOrders.filter(isClosedOrder).sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  const orders = allOrders.filter((order) => !isClosedOrder(order));
  const historyOrder = history.find((order) => order.id === historyOrderId) ?? null;

  return (
    <section className="mt-8 min-w-0">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-xl font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{orders.length}</span>
      </div>
      <div className="min-w-0 space-y-3 md:hidden">
        {orders.length === 0 ? (
          <p className="rounded-xl border bg-white p-5 text-center text-sm text-slate-500">No hay pedidos.</p>
        ) : orders.map((order) => (
          <article key={order.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${highlightIds.includes(order.id) ? "border-action ring-1 ring-action/30" : "border-slate-200"}`}>
            <div className="min-w-0 space-y-4 p-3 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pedido</p>
                  <h3 className="break-all font-bold text-dark">{order.orderNumber || order.id.slice(0, 8)}</h3>
                  <p className="mt-1 break-words text-sm text-slate-700">{order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim()}</p>
                </div>
                <div className="ml-auto min-w-0 max-w-full text-right">
                  <p className="text-lg font-bold text-dark">${order.total.toFixed(2)}</p>
                  <span className={`inline-block max-w-full whitespace-normal break-words rounded-full px-2.5 py-1 text-xs font-semibold ${order.paymentStatus === "paid" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
                    {order.paymentStatus === "paid" ? "Pagado" : "Pago pendiente"}
                  </span>
                </div>
              </div>

              {order.deliveryConfirmation === "disputed" && onDispute && (
                <button type="button" onClick={() => onDispute(order.id)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium ${unreadMessageIds.includes(order.id) ? "animate-pulse border-red-600 bg-red-600 text-white" : "border-amber-400 bg-amber-50 text-amber-800"}`}>
                  <AlertTriangle size={18} className="shrink-0" />
                  El cliente menciona que no le entregaron. Revisa el mensaje
                </button>
              )}

              <div className="grid min-w-0 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entrega</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${order.fulfillmentType === "delivery" ? "bg-action/10 text-action" : "bg-white text-slate-700"}`}>
                    {order.fulfillmentType === "delivery" ? "Para llevar · Envío" : order.fulfillmentType === "dine_in" ? "En local" : "Para recoger"}
                  </span>
                  {(order.deliveryAddress || order.tableNumber) && <p className="mt-1 break-words text-sm text-slate-700">{order.deliveryAddress || `Mesa ${order.tableNumber}`}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tiempo de entrega</p>
                  <p className="mt-1 text-sm"><DeliveryDuration order={order} currentTime={currentTime} /></p>
                </div>
              </div>

              <OrderProgressBar order={order} />

              <div className="min-w-0 [&_button]:min-h-11 [&_button]:w-full [&_div]:min-w-0">
                <OrderStatusControls order={order} onUpdate={onUpdate} />
              </div>

              {order.source === "online" && onView && (
                <button type="button" onClick={() => onView(order)} className="min-h-11 w-full rounded-lg border border-action px-4 py-2 text-sm font-semibold text-action">
                  Ver orden
                </button>
              )}
              {order.source === "local" && onEdit && !(order.status === "delivered" && order.paymentStatus === "paid") && (
                <button type="button" onClick={() => onEdit(order)} className="min-h-11 w-full rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white">
                  Editar orden
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="hidden min-w-0 overflow-x-auto rounded border md:block">
        <table className="w-full min-w-250 text-left text-sm [&_th:nth-child(5)]:w-36 [&_td:nth-child(5)]:w-36 [&_td:nth-child(5)>div]:min-w-0">
          <thead className="bg-slate-50 text-slate-600">
            <tr><th className="p-3">Número</th><th className="p-3">Desde</th><th className="p-3">Cliente</th><th className="p-3">Dirección / mesa</th><th className="p-2">Estatus</th><th className="p-3">Tiempo de entrega</th><th className="p-3">Monto</th></tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr className="border-t"><td colSpan={7} className="p-0"><OrderProgressBar order={order} /></td></tr>
                <tr className={`align-top ${highlightIds.includes(order.id) ? "bg-action/10" : ""}`}>
                  <td className="p-3">
                    {order.orderNumber || order.id.slice(0, 8)}
                    {order.deliveryConfirmation === "disputed" && onDispute && <button type="button" onClick={() => onDispute(order.id)} className={`mt-2 flex max-w-48 items-start gap-1 rounded border px-2 py-1 text-left text-xs font-medium ${unreadMessageIds.includes(order.id) ? "animate-pulse border-red-600 bg-red-600 text-white" : "border-amber-400 bg-amber-50 text-amber-800"}`}><AlertTriangle size={14} className="mt-0.5 shrink-0" />El cliente menciona que no le entregaron. Revisa el mensaje</button>}
                  </td>
                  <td className="p-3">{order.source === "online" ? "En línea" : "En local"}</td>
                  <td className="p-3">{order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim()}</td>
                  <td className="p-3"><span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${order.fulfillmentType === "delivery" ? "bg-action/10 text-action" : "bg-slate-100 text-slate-700"}`}>{order.fulfillmentType === "delivery" ? "Para llevar · Envío" : order.fulfillmentType === "dine_in" ? "En local" : "Para recoger"}</span><div>{order.deliveryAddress || (order.tableNumber ? `Mesa ${order.tableNumber}` : "")}</div></td>
                  <td className="w-36 p-2"><OrderStatusControls order={order} onUpdate={onUpdate} /></td>
                  <td className="p-3"><DeliveryDuration order={order} currentTime={currentTime} /></td>
                  <td className="p-3">
                    ${order.total.toFixed(2)}<br /><span className="text-xs text-slate-500">{order.paymentStatus === "paid" ? "Pagado" : "Pendiente"}</span>
                    {order.source === "online" && onView && <button type="button" onClick={() => onView(order)} className="mt-3 block rounded border border-action px-4 py-2 text-sm font-medium text-action">Ver orden</button>}
                    {order.source === "local" && onEdit && !(order.status === "delivered" && order.paymentStatus === "paid") && <button type="button" onClick={() => onEdit(order)} className="mt-3 block rounded bg-action px-4 py-2 text-sm font-medium text-white">Editar orden</button>}
                  </td>
                </tr>
              </Fragment>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No hay pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setHistoryOpen(true)} className="mt-4 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-dark sm:w-auto">
        Ver historial de hoy ({history.length})
      </button>
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" aria-label={`Historial · ${title}`} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-dark">Historial · {title}</h3>
                <p className="text-sm text-slate-500">Pedidos entregados hoy. Se limpia al día siguiente.</p>
              </div>
              <button type="button" onClick={() => { setHistoryOpen(false); setHistoryOrderId(null); }} className="min-h-11 shrink-0 px-2 text-slate-500">Cerrar</button>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <p className="rounded-lg border p-5 text-center text-sm text-slate-500">Aún no hay pedidos entregados hoy.</p>
              ) : history.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-dark">{order.orderNumber || order.id.slice(0, 8)}</p>
                    <p className="break-words text-sm text-slate-700">{order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim()}</p>
                    <p className="text-xs text-slate-500">Entregado a las {new Date(order.updatedAt ?? order.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button type="button" onClick={() => setHistoryOrderId(order.id)} className="min-h-11 rounded-lg border border-action px-4 py-2 text-sm font-semibold text-action">Ver orden</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {historyOrder && <OrderDetailModal order={historyOrder} onClose={() => setHistoryOrderId(null)} />}
    </section>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-dark">Orden {order.orderNumber || order.id.slice(0, 8)}</h2>
            <p className="text-sm text-slate-600">{order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim()}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500">Cerrar</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Cant.</th><th className="p-3">Platillo</th><th className="p-3">Adicionales</th><th className="p-3 text-right">Importe</th></tr></thead>
            <tbody>
              {order.items.map((item, index) => {
                const additions = Array.isArray(item.additions) ? item.additions.filter(isVariant) : [];
                return <tr key={`${item.productId}-${index}`} className="border-t align-top"><td className="p-3">{item.quantity}</td><td className="p-3">{item.product.name}</td><td className="p-3 text-slate-600">{additions.length > 0 ? additions.map((addition) => addition.name).join(", ") : "—"}</td><td className="p-3 text-right">${item.totalPrice.toFixed(2)}</td></tr>;
              })}
              {order.items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">Sin productos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-right font-semibold">Total: ${order.total.toFixed(2)}</p>
      </div>
    </div>
  );
}

function DeliveryDuration({ order, currentTime }: { order: Order; currentTime: number | null }) {
  if (order.status === "pending_payment") return <span className="font-medium text-amber-700">Esperando pago</span>;
  const startAt = order.source === "online" ? order.acceptedAt || order.createdAt : order.preparingAt || order.createdAt;
  const completedAt = order.readyAt || (order.source === "local" && order.paymentStatus === "paid" ? order.paidAt : null);
  const milliseconds = Math.max(0, new Date(completedAt || currentTime || startAt).getTime() - new Date(startAt).getTime());
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const label = hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;

  return <span className={completedAt ? "font-medium text-slate-700" : "font-medium text-action"}>{label}{completedAt ? "" : " en curso"}</span>;
}

function PendingTransferQueue({ orders, onConfirm }: { orders: Order[]; onConfirm: (orderId: string) => void }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">Transferencias por confirmar</h2>
      {orders.length === 0 ? (
        <p className="rounded border p-4 text-sm text-slate-500">No hay transferencias pendientes.</p>
      ) : (
        <div className="divide-y rounded border px-4">
          {orders.map((order) => (
            <div key={order.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">{order.orderNumber || order.id.slice(0, 8)} · {order.customerName || "Cliente"}</p>
                <p className="text-sm text-slate-600">Total recibido a confirmar: ${order.total.toFixed(2)}</p>
              </div>
              <button type="button" onClick={() => onConfirm(order.id)} className="rounded bg-action px-4 py-2 text-sm font-medium text-white">
                Confirmar transferencia
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function OrderStatusControls({ order, onUpdate }: { order: Order; onUpdate: (orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") => void }) {
  const controlClass = "flex w-full min-w-0 flex-wrap gap-2 md:min-w-68";
  const buttonClass = "rounded border bg-action px-4 py-2 text-left text-sm font-medium text-white";
  const animatedButtonProps = {
    animate: { boxShadow: ["0 0 0 0 rgba(217,93,57,0.5)", "0 0 0 8px rgba(217,93,57,0)", "0 0 0 0 rgba(217,93,57,0)"] },
    transition: { duration: 1.8, repeat: Infinity },
  };

  if (order.source === "local") {
    return (
      <div className={controlClass}>
        {order.status === "preparing" && (
          <motion.button
            type="button"
            {...animatedButtonProps}
            onClick={() => onUpdate(order.id, order.fulfillmentType === "pickup" ? "ready_pickup" : order.fulfillmentType === "delivery" ? "ready_delivery" : "delivered")}
            className={`${buttonClass} border-action`}
          >
            En preparación
          </motion.button>
        )}
        {order.status === "ready_pickup" && <button type="button" onClick={() => onUpdate(order.id, "delivered")} className={buttonClass}>Lista para recoger</button>}
        {order.status === "ready_delivery" && <button type="button" onClick={() => onUpdate(order.id, "delivered")} className={buttonClass}>Lista para envío</button>}
        {order.status === "delivered" && order.paymentStatus === "pending" && <button type="button" onClick={() => onUpdate(order.id, "delivered", "paid")} className={buttonClass}>Marcar pagada</button>}
        {order.status === "delivered" && order.paymentStatus === "paid" && <span className="max-w-full whitespace-normal break-words rounded border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Entregada y pagada</span>}
      </div>
    );
  }

  if (order.status === "pending_payment" && order.paymentMethod === "transfer") {
    return <div className={controlClass}><ShineButton onClick={() => onUpdate(order.id, "accepted", "paid")}>Confirmar transferencia</ShineButton></div>;
  }

  const readyStatus: OrderStatus = order.fulfillmentType === "delivery" ? "ready_delivery" : "ready_pickup";
  const steps: OrderStatus[] = ["accepted", "preparing", readyStatus, "delivered"];
  const currentIndex = steps.indexOf(order.status);

  if (order.status === "delivered") {
    return <div className={controlClass}><span className="max-w-full whitespace-normal break-words rounded border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{statusLabels.delivered}</span></div>;
  }

  const next = steps[currentIndex + 1];
  if (currentIndex < 0 || !next) {
    return <span className="break-words text-sm text-slate-500">{statusLabels[order.status]}</span>;
  }

  return (
    <div className={controlClass}>
      <motion.button
        type="button"
        {...animatedButtonProps}
        onClick={() => onUpdate(order.id, next, next === "delivered" && order.fulfillmentType === "pickup" ? "paid" : undefined)}
        className={`${buttonClass} border-action`}
      >
        {order.status === "ready_delivery" ? "En ruta" : statusLabels[order.status]}
      </motion.button>
    </div>
  );
}
function DeliveryCodeModal({ order, confirming, onAskClose, onKeepOpen, onClose }: { order: Order; confirming: boolean; onAskClose: () => void; onKeepOpen: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-label="Código de envío" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm text-slate-600">Código de envío · {order.orderNumber || order.id.slice(0, 8)}</p>
        <p className="mt-3 text-5xl font-bold tracking-[0.3em] text-dark">{order.deliveryCode?.activeCode}</p>
        <p className="mt-3 text-sm text-slate-600">Comparte este código con tu repartidor para que vea el pedido en <span className="font-medium">/delivery</span>.</p>
        {confirming ? (
          <div className="mt-5">
            <p className="font-semibold text-dark">¿Tu repartidor ya cuenta con el pedido?</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-full bg-action px-4 py-2.5 font-medium text-white">Sí, cerrar</button>
              <button type="button" onClick={onKeepOpen} className="flex-1 rounded-full border border-border px-4 py-2.5 font-medium text-dark">No</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onAskClose} className="mt-5 w-full rounded-full bg-action px-4 py-2.5 font-medium text-white">Cerrar</button>
        )}
      </div>
    </div>
  );
}

function DeliveryCodesPanel({ orders }: { orders: Order[] }) {
  const [copied, setCopied] = useState(false);
  const allCodes = orders.flatMap((order) => (order.deliveryCode?.activeCode ? [order.deliveryCode.activeCode] : []));

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(allCodes.join(" "));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xl font-semibold">Códigos de envío</h2>
      <p className="mb-3 text-sm text-slate-500">Comparte los códigos con tu repartidor; los ingresa juntos en <span className="font-medium">/delivery</span> para hacer varios envíos en una sola ruta.</p>
      {allCodes.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-action/40 bg-action/5 p-3">
          <span className="text-sm font-semibold">{allCodes.length} códigos listos:</span>
          <span className="font-mono text-lg font-bold tracking-widest">{allCodes.join(" ")}</span>
          <button type="button" onClick={() => void copyAll()} className="rounded-full bg-action px-4 py-1.5 text-sm font-medium text-white">{copied ? "¡Copiado!" : "Copiar todos"}</button>
        </div>
      )}
      {orders.length === 0 ? (
        <p className="rounded border p-4 text-sm text-slate-500">No hay códigos activos. Se genera uno al marcar un pedido como «Lista para envío».</p>
      ) : (
        <div className="divide-y rounded border px-4">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{order.orderNumber || order.id.slice(0, 8)} · {order.customerName || "Cliente"}</p>
                <p className="text-sm text-slate-600">{order.deliveryAddress || "Sin dirección"}</p>
                <p className="text-xs text-slate-500">Vence {new Date(order.deliveryCode?.expiresAt ?? "").toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className="rounded-xl bg-dark px-4 py-2 text-2xl font-bold tracking-widest text-white">{order.deliveryCode?.activeCode}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ShineButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="relative overflow-hidden rounded bg-action px-4 py-2 text-sm font-medium text-white">
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/40"
        animate={{ left: ["-50%", "150%"] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
      />
    </button>
  );
}

function OrderProgressBar({ order }: { order: Order }) {
  const readyStatus: OrderStatus = order.fulfillmentType === "delivery" ? "ready_delivery" : "ready_pickup";
  const steps: OrderStatus[] = order.source === "local"
    ? ["preparing", readyStatus, "delivered"]
    : ["pending_payment", "accepted", "preparing", readyStatus, "delivered"];
  const index = Math.max(0, steps.indexOf(order.status));
  const percent = steps.length === 1 ? 100 : Math.round(10 + (index * 90) / (steps.length - 1));
  return (
    <div className="h-1 w-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full transition-all duration-500 ${percent === 100 ? "bg-slate-400" : "bg-action"}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function isVariant(value: unknown): value is Variant { if (!value || typeof value !== "object") { return false; } return "id" in value && "name" in value && "price" in value && typeof value.id === "string" && typeof value.name === "string" && typeof value.price === "number"; }
function ClosureSummary({ closure, onClose }: { closure: Closure; onClose: () => void }) { return <section className="mt-6 rounded border p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Resumen de jornada</h2><button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">Cerrar</button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Pedidos" value={String(closure.orderCount)} /><Metric label="Total" value={`$${closure.totalAmount.toFixed(2)}`} /><Metric label="En línea" value={String(closure.onlineOrderCount)} /><Metric label="En local" value={String(closure.localOrderCount)} /></div><div className="mt-4 grid gap-4 md:grid-cols-3"><SummaryList title="Horas de mayor afluencia" values={closure.summary.busiestHours.map((item) => `${item.hour}:00 - ${item.orderCount} pedidos`)} /><SummaryList title="Platillos estrella" values={closure.summary.starDishes.map((item) => `${item.name} - ${item.quantity}`)} /><SummaryList title="Clientes recurrentes" values={closure.summary.recurringCustomers.map((item) => `${item.name} - ${item.orders} pedidos`)} /></div></section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded border p-3"><p className="text-sm text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>; }
function SummaryList({ title, values }: { title: string; values: string[] }) { return <div><h3 className="font-semibold">{title}</h3><ul className="mt-2 text-sm text-slate-600">{values.length > 0 ? values.map((value) => <li key={value}>{value}</li>) : <li>Sin datos</li>}</ul></div>; }