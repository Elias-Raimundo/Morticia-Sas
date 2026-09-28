"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
};

type Client = {
  id: number;
  name: string;
  email: string | null;
  hasAccess?: boolean;
  legalName?: string | null;
  discount?: number;
  balance: number;
};

type CartLine = { productId: number; quantity: number };

type Sale = {
  id: number;
  remito: string;
  createdAt: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  customer: { id: number; name: string; legalName?: string | null };
  itemsCount: number;
};

const PAYMENT_OPTIONS = [
  { value: "", label: "A cuenta (queda debiendo)" },
  { value: "efectivo", label: "Cobrado en efectivo" },
  { value: "transferencia", label: "Cobrado por transferencia" },
  { value: "tarjeta", label: "Cobrado con tarjeta" },
  { value: "cheque", label: "Cobrado con cheque" },
  { value: "cheque electrónico", label: "Cobrado con cheque electrónico" },
  { value: "otro", label: "Cobrado (otra forma)" },
];

// Sin decimales si el importe es entero; con 2 decimales si no ($ 1.250,50).
const formatMoney = (n: number) => {
  const hasDecimals = Math.abs(n - Math.round(n)) > 0.0001;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(n);
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400";

export default function VentasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // cliente
  const [customerMode, setCustomerMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cuit, setCuit] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [existingId, setExistingId] = useState<number | null>(null);

  // productos
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

  // cobro
  const [paymentMethod, setPaymentMethod] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [showCartPanel, setShowCartPanel] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const goToPayment = () => {
    setShowCartPanel(false);
    paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const load = async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        apiFetch("/api/products"),
        apiFetch("/api/balance/admin/clients"),
        apiFetch("/api/sales"),
      ]);
      const [p, c, s] = await Promise.all([
        pRes.json().catch(() => []),
        cRes.json().catch(() => []),
        sRes.json().catch(() => []),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setClients(Array.isArray(c) ? c : []);
      setSales(Array.isArray(s) ? s : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---------- cálculos ----------
  const productById = (id: number) => products.find((p) => p.id === id);
  const selectedClient = clients.find((c) => c.id === existingId) ?? null;
  const discountPct = customerMode === "existing" ? selectedClient?.discount ?? 0 : 0;

  const subtotal = cart.reduce((acc, l) => acc + (productById(l.productId)?.price ?? 0) * l.quantity, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = subtotal - discountAmount;

  const productQuery = productSearch.trim().toLowerCase();
  const productResults = products
    .filter((p) => !productQuery || p.name.toLowerCase().includes(productQuery))
    .slice(0, 8);

  const clientQuery = clientSearch.trim().toLowerCase();
  const clientResults = clients
    .filter(
      (c) =>
        !clientQuery ||
        c.name.toLowerCase().includes(clientQuery) ||
        (c.legalName ?? "").toLowerCase().includes(clientQuery)
    )
    .slice(0, 6);

  // ---------- carrito ----------
  const addToCart = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) {
          toast.error(`Solo hay ${p.stock} de ${p.name} en stock`);
          return prev;
        }
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: p.id, quantity: 1 }];
    });
  };

  const setQuantity = (productId: number, raw: string) => {
    const p = productById(productId);
    let q = Math.floor(Number(raw));
    if (!Number.isFinite(q) || q < 1) q = 1;
    if (p && q > p.stock) {
      q = p.stock;
      toast.error(`Solo hay ${p.stock} de ${p.name} en stock`);
    }
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)));
  };

  const removeFromCart = (productId: number) =>
    setCart((prev) => {
      const next = prev.filter((l) => l.productId !== productId);
      if (next.length === 0) setShowCartPanel(false);
      return next;
    });

  // ---------- remito ----------
  const fetchRemito = async (saleId: number) => {
    const res = await apiFetch(`/api/sales/${saleId}/remito`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "No se pudo cargar el remito");
    }
    return res.blob();
  };

  const viewRemito = async (saleId: number) => {
    try {
      const blob = await fetchRemito(saleId);
      window.open(window.URL.createObjectURL(blob), "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error cargando el remito");
    }
  };

  const downloadRemito = async (saleId: number, remito: string) => {
    const blob = await fetchRemito(saleId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remito_${remito}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // ---------- registrar venta ----------
  const resetForm = () => {
    setName("");
    setLegalName("");
    setCuit("");
    setAddress("");
    setEmail("");
    setClientSearch("");
    setExistingId(null);
    setProductSearch("");
    setCart([]);
    setPaymentMethod("");
    setComments("");
    setShowCartPanel(false);
  };

  const submitSale = async () => {
    if (customerMode === "new" && !name.trim()) {
      toast.error("Ingresá el nombre del local");
      return;
    }
    if (customerMode === "existing" && !existingId) {
      toast.error("Elegí un cliente");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          customer:
            customerMode === "existing"
              ? { id: existingId }
              : {
                  name: name.trim(),
                  legalName: legalName.trim() || undefined,
                  cuit: cuit.trim() || undefined,
                  address: address.trim() || undefined,
                  email: email.trim() || undefined,
                },
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          paymentMethod: paymentMethod || null,
          comments: comments.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo registrar la venta");
        return;
      }

      toast.success(`Venta registrada · Remito N° ${data.order.remito}`);
      if (data.customerReused) {
        toast.info("Ya existía un cliente con ese CUIT/CUIL: la venta se cargó a esa cuenta");
      }

      try {
        await downloadRemito(data.order.id, data.order.remito);
      } catch {
        toast.error("La venta se registró, pero no se pudo descargar el remito. Descargalo desde la lista.");
      }

      resetForm();
      load(); // actualiza stock, clientes y la lista de ventas
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSale = async (sale: Sale) => {
    const ok = window.confirm(
      `¿Anular la venta (remito N° ${sale.remito})?\n\nSe devuelve el stock y se revierte el saldo del cliente.`
    );
    if (!ok) return;
    setCancelingId(sale.id);
    try {
      const res = await apiFetch(`/api/orders/${sale.id}/cancel`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo anular la venta");
        return;
      }
      toast.success("Venta anulada");
      load();
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6 pb-28">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Venta al público</h1>
          <p className="mt-1 text-sm text-gray-700">
            Vendé a un cliente que no hizo el pedido por el sistema y generá el remito en PDF. El
            cliente nuevo queda guardado sin acceso: se ve en Administración con su historial y saldo.
          </p>
        </div>
      </div>

      {/* 1. Cliente */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">1. Cliente</h2>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setCustomerMode("new")}
              className={`px-3 py-1.5 ${
                customerMode === "new" ? "bg-amber-500 font-semibold text-gray-950" : "bg-white text-gray-700"
              }`}
            >
              Cliente nuevo
            </button>
            <button
              onClick={() => setCustomerMode("existing")}
              className={`px-3 py-1.5 border-l border-gray-300 ${
                customerMode === "existing" ? "bg-amber-500 font-semibold text-gray-950" : "bg-white text-gray-700"
              }`}
            >
              Cliente existente
            </button>
          </div>
        </div>

        {customerMode === "new" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Nombre del local *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Razón social (opcional)"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="CUIT / CUIL (opcional)"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Dirección (opcional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              type="email"
              className={inputClass}
              placeholder="Email (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-gray-500 md:col-span-2">
              Si cargás un CUIT/CUIL que ya pertenece a un cliente, la venta se le carga a esa cuenta.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedClient ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">{selectedClient.name}</span>
                  {selectedClient.legalName && ` · ${selectedClient.legalName}`}
                  {selectedClient.hasAccess === false && (
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                      sin acceso
                    </span>
                  )}
                  {!!selectedClient.discount && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                      {selectedClient.discount}% de descuento
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExistingId(null)}
                  className="text-sm text-amber-700 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  className={inputClass}
                  placeholder="Buscar cliente por nombre o razón social..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <ul className="divide-y rounded-lg border border-gray-200">
                  {clientResults.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">No hay clientes que coincidan.</li>
                  ) : (
                    clientResults.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => setExistingId(c.id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50"
                        >
                          <span className="text-gray-900">
                            {c.name}
                            {c.legalName && <span className="text-gray-500"> · {c.legalName}</span>}
                          </span>
                          {c.hasAccess === false && (
                            <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                              sin acceso
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Productos */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">2. Productos</h2>

        <input
          className={inputClass}
          placeholder="Buscar producto..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
        {loading ? (
          <p className="text-sm text-gray-500">Cargando productos...</p>
        ) : (
          <ul className="divide-y rounded-lg border border-gray-200">
            {productResults.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No hay productos que coincidan.</li>
            ) : (
              productResults.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatMoney(p.price)} por {p.unit} ·{" "}
                      <span className={p.stock <= 0 ? "text-red-600 font-medium" : ""}>
                        {p.stock <= 0 ? "sin stock" : `stock: ${p.stock}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                  >
                    + Agregar
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {cart.length > 0 && (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
              Productos de la venta
            </div>
            <ul className="divide-y">
              {cart.map((l) => {
                const p = productById(l.productId);
                if (!p) return null;
                return (
                  <li key={l.productId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{formatMoney(p.price)} c/u</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={p.stock}
                      value={l.quantity}
                      onChange={(e) => setQuantity(l.productId, e.target.value)}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                    />
                    <span className="w-24 text-right font-semibold text-gray-900">
                      {formatMoney(p.price * l.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(l.productId)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Cobro */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6 space-y-4">
        <h2 ref={paymentSectionRef} className="scroll-mt-20 text-lg font-bold text-gray-900">3. Cobro y remito</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className={inputClass}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="Observaciones (opcional, salen en el remito)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="text-sm text-gray-700">
            {discountPct > 0 && (
              <div>
                Subtotal {formatMoney(subtotal)} · Descuento {discountPct}%: −{formatMoney(discountAmount)}
              </div>
            )}
            <div className="text-lg font-bold text-gray-900">Total: {formatMoney(total)}</div>
            <div className="text-xs text-gray-500">
              {paymentMethod ? "Se registra el cobro en el momento." : "Queda a cuenta del cliente."}
            </div>
          </div>
          <button
            onClick={submitSale}
            disabled={submitting || cart.length === 0}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Registrando..." : "Registrar venta y generar remito"}
          </button>
        </div>
      </div>

      {/* Barra fija: total y acceso al carrito visibles todo el tiempo, sin scrollear */}
      {cart.length > 0 && (
        <>
          {showCartPanel && (
            <div
              className="fixed inset-x-0 bottom-[64px] z-40 mx-auto max-h-[55vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-b-0 border-gray-200 bg-white p-4 shadow-2xl md:bottom-[68px]"
              role="dialog"
              aria-label="Productos de la venta"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Productos de la venta</span>
                <button onClick={() => setShowCartPanel(false)} className="text-sm text-gray-500 hover:text-gray-700">
                  Cerrar ✕
                </button>
              </div>
              <ul className="divide-y">
                {cart.map((l) => {
                  const p = productById(l.productId);
                  if (!p) return null;
                  return (
                    <li key={l.productId} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-gray-900">
                        {l.quantity} × {p.name}
                      </span>
                      <span className="shrink-0 font-semibold text-gray-900">{formatMoney(p.price * l.quantity)}</span>
                      <button
                        onClick={() => removeFromCart(l.productId)}
                        className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
              {discountPct > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Subtotal {formatMoney(subtotal)} · Descuento {discountPct}%: −{formatMoney(discountAmount)}
                </p>
              )}
              <button
                onClick={goToPayment}
                className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
              >
                Ir a cobrar
              </button>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
              <button
                onClick={() => setShowCartPanel((v) => !v)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="text-xl">🛒</span>
                <span className="min-w-0 truncate">
                  <span className="block text-xs text-gray-500">
                    {cart.length} {cart.length === 1 ? "producto" : "productos"} · {showCartPanel ? "ocultar" : "ver detalle"}
                  </span>
                  <span className="block text-base font-bold text-gray-900">{formatMoney(total)}</span>
                </span>
              </button>
              <button
                onClick={goToPayment}
                className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
              >
                Ir a cobrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Últimas ventas */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Últimas ventas al público</h2>
        </div>
        {loading ? (
          <div className="p-5 text-sm text-gray-600">Cargando...</div>
        ) : sales.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">Todavía no registraste ventas al público.</div>
        ) : (
          <ul className="divide-y">
            {sales.map((s) => {
              const cancelled = s.status === "cancelled";
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">Remito N° {s.remito}</span>
                      {cancelled ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Anulada
                        </span>
                      ) : s.paymentMethod ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Cobrada · {s.paymentMethod}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          A cuenta
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(s.createdAt)} · {s.customer.name}
                      {s.customer.legalName && ` (${s.customer.legalName})`} · {s.itemsCount}{" "}
                      {s.itemsCount === 1 ? "producto" : "productos"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${cancelled ? "text-gray-400 line-through" : "text-gray-900"}`}
                    >
                      {formatMoney(s.total)}
                    </span>
                    <button
                      onClick={() => viewRemito(s.id)}
                      className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Ver remito
                    </button>
                    {!cancelled && (
                      <button
                        onClick={() => cancelSale(s)}
                        disabled={cancelingId === s.id}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancelingId === s.id ? "..." : "Anular"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
