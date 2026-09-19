"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import AddressFields, { type AddressValue } from "@/src/components/location/address-fields";

type Variant = { id: string; name: string; price: number };
type Product = { id: string; name: string; price: number; imageUrl?: string | null; variants: Variant[] };
type PackageComplement = { id: string; name: string; price: number };
type Package = { id: string; name: string; price: number; imageUrl?: string | null; complements: PackageComplement[]; items: Array<{ productId: string; quantity: number }> };
type Promotion = { id: string; name: string; discountType?: "percentage" | "fixed_amount" | null; discountPercent?: number | null; discountAmount?: number | null; appliesToLocalOrders: boolean; appliesToCash: boolean; appliesToCard: boolean; targetProducts: Array<{ productId: string }>; requiredProducts: Array<{ productId: string; quantity: number }> };
type OrderStatus = "accepted" | "preparing" | "ready_pickup" | "ready_delivery" | "delivered";
type Order = { id: string; orderNumber?: string | null; source: "online" | "local"; fulfillmentType: "pickup" | "delivery" | "dine_in"; paymentStatus: "paid" | "pending"; customerName?: string | null; tableNumber?: string | null; deliveryAddress?: string | null; postalCode?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; deliveryReference?: string | null; contactPhone?: string | null; latitude?: number | null; longitude?: number | null; acceptedAt?: string | null; preparingAt?: string | null; readyAt?: string | null; paidAt?: string | null; createdAt: string; status: OrderStatus; total: number; customer: { firstName: string; lastName: string }; items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number; product: { name: string }; additions?: unknown }> };
type DraftItem = { productId: string; name: string; quantity: number; additionIds: string[]; additions: Variant[]; total: number };
type Closure = { orderCount: number; totalAmount: number; onlineOrderCount: number; localOrderCount: number; summary: { busiestHours: Array<{ hour: number; orderCount: number }>; starDishes: Array<{ name: string; quantity: number }>; recurringCustomers: Array<{ name: string; orders: number }> } };

const statusLabels: Record<OrderStatus, string> = { accepted: "Orden aceptada", preparing: "En preparación", ready_pickup: "Lista para recoger", ready_delivery: "Lista para envío", delivered: "Entregada" };
const emptyDeliveryAddress: AddressValue = { street: "", postalCode: "", neighborhood: "", city: "", state: "", country: "México", reference: "", contactPhone: "", latitude: null, longitude: null };

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery" | "dine_in">("pickup");
  const [deliveryLocation, setDeliveryLocation] = useState<AddressValue>(emptyDeliveryAddress);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [additionIds, setAdditionIds] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [packageSelections, setPackageSelections] = useState<Array<{ packageId: string; name: string; price: number; quantity: number; complementIds: string[]; complements: PackageComplement[] }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packageComplementIds, setPackageComplementIds] = useState<string[]>([]);
  const [packageQuantity, setPackageQuantity] = useState("1");
  const [promotionIds, setPromotionIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closure, setClosure] = useState<Closure | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    const [productsResponse, ordersResponse] = await Promise.all([fetch("/api/products"), fetch("/api/orders")]);
    const productsData: unknown = await productsResponse.json();
    const ordersData: unknown = await ordersResponse.json();
    if (!productsResponse.ok || !Array.isArray(productsData)) { setError("No se pudieron cargar los productos"); return; }
    if (!ordersResponse.ok || !Array.isArray(ordersData)) { setError("No se pudieron cargar los pedidos"); return; }
    setProducts(productsData as Product[]);
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

  function resetLine() { setSelectedProductId(""); setQuantity("1"); setAdditionIds([]); }
  function resetOrder() { setCustomerName(""); setTableNumber(""); setFulfillmentType("pickup"); setDeliveryLocation(emptyDeliveryAddress); setItems([]); setPackageSelections([]); setSelectedPackageId(""); setPackageComplementIds([]); setPackageQuantity("1"); setPromotionIds([]); setPaymentMethod("cash"); resetLine(); setEditingOrderId(null); setShowForm(false); setError(""); }

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
    const itemQuantity = Number(quantity);
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) { setError("La cantidad debe ser mayor a cero"); return; }
    const additions = selectedProduct.variants.filter((variant) => additionIds.includes(variant.id));
    const unitPrice = selectedProduct.price + additions.reduce((total, addition) => total + addition.price, 0);
    setItems((current) => [...current, { productId: selectedProduct.id, name: selectedProduct.name, quantity: itemQuantity, additionIds, additions, total: unitPrice * itemQuantity }]);
    setError("");
    resetLine();
  }

  function addPackageToOrder() {
    if (!selectedPackage) { setError("Selecciona un paquete"); return; }
    const itemQuantity = Number(packageQuantity);
    if (!Number.isInteger(itemQuantity) || itemQuantity < 1) { setError("La cantidad debe ser mayor a cero"); return; }
    const complements = selectedPackage.complements.filter((complement) => packageComplementIds.includes(complement.id));
    setPackageSelections((current) => [...current, { packageId: selectedPackage.id, name: selectedPackage.name, price: selectedPackage.price, quantity: itemQuantity, complementIds: packageComplementIds, complements }]);
    setSelectedPackageId(""); setPackageComplementIds([]); setPackageQuantity("1"); setError("");
  }

  async function createOrder() {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/orders", { method: editingOrderId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingOrderId, source: "local", customerName, tableNumber, fulfillmentType, paymentMethod, promotionIds, packages: packageSelections.map(({ packageId, quantity: itemQuantity, complementIds }) => ({ packageId, quantity: itemQuantity, complementIds })), deliveryAddress: deliveryLocation.street, postalCode: deliveryLocation.postalCode, neighborhood: deliveryLocation.neighborhood, city: deliveryLocation.city, state: deliveryLocation.state, deliveryReference: deliveryLocation.reference, contactPhone: deliveryLocation.contactPhone, latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude, items: items.map(({ productId, quantity: itemQuantity, additionIds: itemAdditionIds }) => ({ productId, quantity: itemQuantity, additionIds: itemAdditionIds })) }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo crear la orden"); return; }
      resetOrder(); await loadData();
    } catch { setError("No se pudo conectar con el servidor"); } finally { setSaving(false); }
  }

  async function updateOrder(orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") {
    setError("");
    try {
      const response = await fetch("/api/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: orderId, status, paymentStatus }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo actualizar el pedido"); return; }
      await loadData();
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
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Forma de pago<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "cash" | "card")} className="mt-1 block w-full border p-2"><option value="cash">Efectivo</option><option value="card">Tarjeta</option></select></label></div>
      <div className="rounded border p-4"><h3 className="font-semibold">Promociones aplicables manualmente</h3><div className="mt-3 space-y-2">{promotions.filter((promotion) => promotion.appliesToLocalOrders && (paymentMethod === "cash" ? promotion.appliesToCash : promotion.appliesToCard)).map((promotion) => <label key={promotion.id} className="flex items-center gap-2 rounded border p-2"><input type="checkbox" checked={promotionIds.includes(promotion.id)} onChange={(event) => setPromotionIds((current) => event.target.checked ? [...current, promotion.id] : current.filter((id) => id !== promotion.id))} /><span>{promotion.name}</span><span className="text-sm text-slate-500">{promotion.discountType === "percentage" ? `${promotion.discountPercent || 0}%` : promotion.discountType === "fixed_amount" ? `$${(promotion.discountAmount || 0).toFixed(2)}` : "Regalo"}</span></label>)}{promotions.length === 0 && <p className="text-sm text-slate-500">No hay promociones disponibles.</p>}</div></div>
      <div className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">Agregar producto</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => <button key={product.id} type="button" onClick={() => { setSelectedProductId(product.id); setAdditionIds([]); }} className={`overflow-hidden rounded border text-left ${selectedProductId === product.id ? "border-action ring-2 ring-action/30" : "bg-white"}`}><div className="relative aspect-square w-full bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin imagen</div>}</div><div className="p-2"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-sm text-slate-500">${product.price.toFixed(2)}</p></div></button>)}
        </div>
        {selectedProduct && selectedProduct.variants.length > 0 && <div><p className="mb-2 text-sm font-medium">Adicionales</p><div className="grid gap-2 sm:grid-cols-2">{selectedProduct.variants.map((variant) => <label key={variant.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={additionIds.includes(variant.id)} onChange={(event) => setAdditionIds((current) => event.target.checked ? [...current, variant.id] : current.filter((id) => id !== variant.id))} />{variant.name}{variant.price > 0 ? ` (+$${variant.price.toFixed(2)})` : ""}</label>)}</div></div>}
        {selectedProduct && <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block text-sm font-medium">Cantidad<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 block w-full border p-2 sm:w-32" /></label><button type="button" onClick={addProductToOrder} className="rounded border bg-action px-4 py-2 text-white">Guardar producto</button></div>}</div>
      <div className="rounded border p-4"><h3 className="font-semibold">Agregar paquete</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{packages.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedPackageId(item.id); setPackageComplementIds([]); }} className={`overflow-hidden rounded border text-left ${selectedPackageId === item.id ? "border-action ring-2 ring-action/30" : "bg-white"}`}><div className="relative aspect-square bg-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Sin imagen</div>}</div><div className="p-2"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-sm text-slate-500">${item.price.toFixed(2)}</p></div></button>)}</div>{selectedPackage && <div className="mt-4 space-y-3 border-t pt-4"><p className="font-medium">Complementos de {selectedPackage.name}</p>{selectedPackage.complements.length > 0 ? <div className="grid gap-2 sm:grid-cols-2">{selectedPackage.complements.map((complement) => <label key={complement.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={packageComplementIds.includes(complement.id)} onChange={(event) => setPackageComplementIds((current) => event.target.checked ? [...current, complement.id] : current.filter((id) => id !== complement.id))} />{complement.name}{complement.price > 0 ? ` (+$${complement.price.toFixed(2)})` : ""}</label>)}</div> : <p className="text-sm text-slate-500">Este paquete no tiene complementos.</p>}<div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium">Cantidad<input type="number" min="1" value={packageQuantity} onChange={(event) => setPackageQuantity(event.target.value)} className="mt-1 block w-full border p-2 sm:w-32" /></label><button type="button" onClick={addPackageToOrder} className="rounded bg-action px-4 py-2 text-white">Agregar paquete</button></div></div>}</div>
      {packageSelections.length > 0 && <div className="rounded border p-4"><h3 className="font-semibold">Paquetes de la orden</h3>{packageSelections.map((item, index) => <div key={`${item.packageId}-${index}`} className="mt-2 flex justify-between gap-3 text-sm"><div><p>{item.quantity}x {item.name}</p>{item.complements.length > 0 && <p className="text-slate-500">{item.complements.map((complement) => complement.name).join(", ")}</p>}</div><div className="flex items-center gap-3"><span className="font-medium">${((item.price + item.complements.reduce((total, complement) => total + complement.price, 0)) * item.quantity).toFixed(2)}</span><button type="button" onClick={() => setPackageSelections((current) => current.filter((_, selectionIndex) => selectionIndex !== index))} className="text-red-600">Quitar</button></div></div>)}</div>}
      {(items.length > 0 || packageSelections.length > 0) && <div className="rounded border p-4"><h3 className="font-semibold">Productos de la orden</h3><div className="mt-3 space-y-2">{items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-start justify-between gap-3 border-b pb-2 text-sm"><div><p>{item.quantity}x {item.name}</p>{item.additions.length > 0 && <p className="text-slate-500">{item.additions.map((addition) => addition.name).join(", ")}</p>}</div><div className="flex items-center gap-3"><span>${item.total.toFixed(2)}</span><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600">Quitar</button></div></div>)}</div><div className="mt-3 space-y-1 text-right"><p>Subtotal: ${formSubtotal.toFixed(2)}</p>{promotionDiscount > 0 && <p className="text-action">Promociones: -${promotionDiscount.toFixed(2)}</p>}<p className="font-semibold">Monto: ${formTotal.toFixed(2)}</p></div></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}<div><button type="button" onClick={createOrder} disabled={saving || (items.length === 0 && packageSelections.length === 0)} className="rounded bg-action px-4 py-2 text-white disabled:bg-gray-400">{saving ? "Guardando..." : editingOrderId ? "Guardar cambios" : "Guardar orden completa"}</button><button type="button" onClick={resetOrder} className="ml-2 rounded border px-4 py-2">Cancelar</button></div></section>}
    {error && !showForm && <p className="mt-4 text-sm text-red-600">{error}</p>}{closure && <ClosureSummary closure={closure} onClose={() => setClosure(null)} />}
    <OrdersTable title="Pedidos en línea" orders={orders.filter((order) => order.source === "online")} onUpdate={updateOrder} onEdit={editOrder} currentTime={currentTime} /><OrdersTable title="Pedidos en local" orders={orders.filter((order) => order.source === "local")} onUpdate={updateOrder} onEdit={editOrder} currentTime={currentTime} />
  </div>;
}

function OrdersTable({ title, orders, onUpdate, onEdit, currentTime }: { title: string; orders: Order[]; onUpdate: (orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") => void; onEdit: (order: Order) => void; currentTime: number | null }) {
  return <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">{title}</h2><div className="overflow-x-auto rounded border"><table className="w-full min-w-250 text-left text-sm [&_th:nth-child(5)]:w-36 [&_td:nth-child(5)]:w-36 [&_td:nth-child(5)>div]:min-w-0"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Número</th><th className="p-3">Desde</th><th className="p-3">Cliente</th><th className="p-3">Dirección / mesa</th><th className="p-2">Estatus</th><th className="p-3">Tiempo de entrega</th><th className="p-3">Monto</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t align-top"><td className="p-3">{order.orderNumber || order.id.slice(0, 8)}</td><td className="p-3">{order.source === "online" ? "En línea" : "En local"}</td><td className="p-3">{order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim()}</td><td className="p-3">{order.deliveryAddress || (order.tableNumber ? `Mesa ${order.tableNumber}` : "Para recoger")}</td><td className="w-36 p-2"><OrderStatusControls order={order} onUpdate={onUpdate} /></td><td className="p-3"><DeliveryDuration order={order} currentTime={currentTime} /></td><td className="p-3">${order.total.toFixed(2)}<br /><span className="text-xs text-slate-500">{order.paymentStatus === "paid" ? "Pagado" : "Pendiente"}</span>{order.source === "local" && !(order.status === "delivered" && order.paymentStatus === "paid") && <button type="button" onClick={() => onEdit(order)} className="mt-3 block rounded bg-action px-4 py-2 text-sm font-medium text-white">Editar orden</button>}</td></tr>)}{orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No hay pedidos.</td></tr>}</tbody></table></div></section>;
}

function DeliveryDuration({ order, currentTime }: { order: Order; currentTime: number | null }) {
  const startAt = order.source === "online" ? order.acceptedAt || order.createdAt : order.preparingAt || order.createdAt;
  const completedAt = order.readyAt || (order.source === "local" && order.paymentStatus === "paid" ? order.paidAt : null);
  const milliseconds = Math.max(0, new Date(completedAt || currentTime || startAt).getTime() - new Date(startAt).getTime());
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const label = hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;

  return <span className={completedAt ? "font-medium text-slate-700" : "font-medium text-action"}>{label}{completedAt ? "" : " en curso"}</span>;
}
function OrderStatusControls({ order, onUpdate }: { order: Order; onUpdate: (orderId: string, status: OrderStatus, paymentStatus?: "paid" | "pending") => void }) { if (order.source === "local") { return <div className="flex min-w-68 flex-wrap gap-2">{order.status === "preparing" && <motion.button type="button" animate={{ boxShadow: ["0 0 0 0 rgba(217,93,57,0.5)", "0 0 0 8px rgba(217,93,57,0)", "0 0 0 0 rgba(217,93,57,0)"] }} transition={{ duration: 1.8, repeat: Infinity }} onClick={() => onUpdate(order.id, order.fulfillmentType === "pickup" ? "ready_pickup" : order.fulfillmentType === "delivery" ? "ready_delivery" : "delivered")} className="rounded border-action bg-action px-4 py-2 text-sm font-medium text-white">En preparación</motion.button>}{order.status === "ready_pickup" && <button type="button" onClick={() => onUpdate(order.id, "delivered")} className="rounded border bg-action px-4 py-2 text-sm font-medium text-white">Lista para recoger</button>}{order.status === "ready_delivery" && <button type="button" onClick={() => onUpdate(order.id, "delivered")} className="rounded border bg-action px-4 py-2 text-sm font-medium text-white">Lista para envío</button>}{order.status === "delivered" && order.paymentStatus === "pending" && <button type="button" onClick={() => onUpdate(order.id, "delivered", "paid")} className="rounded border bg-action px-4 py-2 text-sm font-medium text-white">Marcar pagada</button>}{order.status === "delivered" && order.paymentStatus === "paid" && <span className="rounded border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Entregada y pagada</span>}</div>; } const readyStatus: OrderStatus = order.fulfillmentType === "delivery" ? "ready_delivery" : "ready_pickup"; const steps: OrderStatus[] = ["accepted", "preparing", readyStatus, "delivered"]; const currentIndex = steps.indexOf(order.status); const complete = order.status === "delivered" && order.paymentStatus === "paid"; return <div className="flex min-w-68 flex-wrap gap-2">{steps.map((status, index) => <button key={status} type="button" disabled={index < currentIndex || order.status === "delivered"} onClick={() => onUpdate(order.id, status, status === "delivered" && order.fulfillmentType === "pickup" ? "paid" : undefined)} className={`rounded px-4 py-2 text-sm font-medium ${complete && status === "delivered" ? "border border-slate-300 bg-slate-200 text-slate-700" : order.status === status ? "border border-action bg-action text-white" : "border bg-white"}`}>{statusLabels[status]}</button>)}</div>; }
function isVariant(value: unknown): value is Variant { if (!value || typeof value !== "object") { return false; } return "id" in value && "name" in value && "price" in value && typeof value.id === "string" && typeof value.name === "string" && typeof value.price === "number"; }
function ClosureSummary({ closure, onClose }: { closure: Closure; onClose: () => void }) { return <section className="mt-6 rounded border p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Resumen de jornada</h2><button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">Cerrar</button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Pedidos" value={String(closure.orderCount)} /><Metric label="Total" value={`$${closure.totalAmount.toFixed(2)}`} /><Metric label="En línea" value={String(closure.onlineOrderCount)} /><Metric label="En local" value={String(closure.localOrderCount)} /></div><div className="mt-4 grid gap-4 md:grid-cols-3"><SummaryList title="Horas de mayor afluencia" values={closure.summary.busiestHours.map((item) => `${item.hour}:00 - ${item.orderCount} pedidos`)} /><SummaryList title="Platillos estrella" values={closure.summary.starDishes.map((item) => `${item.name} - ${item.quantity}`)} /><SummaryList title="Clientes recurrentes" values={closure.summary.recurringCustomers.map((item) => `${item.name} - ${item.orders} pedidos`)} /></div></section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded border p-3"><p className="text-sm text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>; }
function SummaryList({ title, values }: { title: string; values: string[] }) { return <div><h3 className="font-semibold">{title}</h3><ul className="mt-2 text-sm text-slate-600">{values.length > 0 ? values.map((value) => <li key={value}>{value}</li>) : <li>Sin datos</li>}</ul></div>; }