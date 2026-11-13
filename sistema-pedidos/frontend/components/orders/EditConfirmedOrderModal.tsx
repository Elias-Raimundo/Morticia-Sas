"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { formatCountdown, useCountdown } from "@/lib/useCountdown";
import PaymentMethodPicker, { PaymentInfo } from "./PaymentMethodPicker";

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: { name: string; unit?: string } | null;
};

export type EditableOrder = {
  id: number;
  deliveryDate?: string | null;
  comments?: string | null;
  clientPaymentMethod?: string | null;
  editableUntil?: string | null;
  items?: OrderItem[];
};

type Product = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
};

type Line = {
  productId: number;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: number; // existentes: el precio con el que se pidió; nuevos: el precio actual
  originalQty: number; // 0 si es un producto agregado ahora
};

const pad = (n: number) => String(n).padStart(2, "0");
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function EditConfirmedOrderModal({
  order,
  open,
  onClose,
  onSaved,
}: {
  order: EditableOrder | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comments, setComments] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [addProductId, setAddProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const seconds = useCountdown(order?.editableUntil);
  const expired = !!order && seconds <= 0;

  // Al abrir: cargar los datos actuales del pedido + catálogo + alias/QR
  useEffect(() => {
    if (!open || !order) return;

    setLines(
      (order.items ?? []).map((it) => ({
        productId: it.productId,
        name: it.product?.name ?? `Producto #${it.productId}`,
        unit: it.product?.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        originalQty: it.quantity,
      }))
    );
    setComments(order.comments ?? "");
    setDeliveryDate(order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : "");
    setPaymentMethod(order.clientPaymentMethod ?? "");
    setAddProductId("");

    apiFetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));

    apiFetch("/api/orders/payment-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => info && setPaymentInfo(info))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Productos que se pueden agregar: activos, con stock y que no estén ya en el pedido
  const addable = useMemo(
    () => products.filter((p) => p.stock > 0 && !lines.some((l) => l.productId === p.id)),
    [products, lines]
  );

  // Stock máximo que puede pedir en cada línea: el disponible + lo que ya tiene reservado
  const maxFor = (l: Line) => {
    const p = productById.get(l.productId);
    return p ? p.stock + l.originalQty : undefined;
  };

  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);

  const setQty = (productId: number, qty: number) =>
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l))
    );

  const removeLine = (productId: number) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const addLine = () => {
    const p = productById.get(Number(addProductId));
    if (!p) return;
    setLines((prev) => [
      ...prev,
      { productId: p.id, name: p.name, unit: p.unit, quantity: 1, unitPrice: p.price, originalQty: 0 },
    ]);
    setAddProductId("");
  };

  const save = async () => {
    if (!order) return;
    if (expired) return toast.error("Se terminó el tiempo para modificar el pedido");
    if (lines.length === 0) return toast.error("El pedido necesita al menos un producto");
    if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity <= 0)) {
      return toast.error("Revisá las cantidades");
    }
    if (!deliveryDate) return toast.error("Indicá la fecha de entrega");
    if (!paymentMethod) return toast.error("Elegí una forma de pago");

    setSaving(true);
    try {
      const res = await apiFetch(`/api/orders/${order.id}/edit`, {
        method: "PATCH",
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          comments,
          deliveryDate: `${deliveryDate}T00:00:00`,
          clientPaymentMethod: paymentMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo modificar el pedido");
        return;
      }
      toast.success("Pedido modificado ✅");
      onSaved();
      onClose();
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b bg-white p-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Modificar pedido #{order.id}</h3>
            <p className={`text-sm ${expired ? "text-red-600" : "text-amber-700"}`}>
              {expired
                ? "Se terminó el tiempo para modificarlo"
                : `Te quedan ${formatCountdown(seconds)} para guardar los cambios`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5 text-gray-900">
          {/* Productos */}
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-12 bg-gray-100 p-3 text-xs font-semibold text-gray-700">
              <div className="col-span-5">Producto</div>
              <div className="col-span-3 text-right">Cant</div>
              <div className="col-span-3 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            {lines.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">El pedido está vacío. Agregá al menos un producto.</div>
            ) : (
              lines.map((l) => (
                <div
                  key={l.productId}
                  className="grid grid-cols-12 items-center gap-2 border-t p-3 text-sm"
                >
                  <div className="col-span-5 min-w-0">
                    <div className="break-words font-medium">{l.name}</div>
                    <div className="text-xs text-gray-500">
                      ${l.unitPrice.toLocaleString()} {l.unit ? `/ ${l.unit}` : ""}
                      {l.originalQty === 0 && <span className="ml-1 text-green-700">· nuevo</span>}
                    </div>
                  </div>

                  <div className="col-span-3 flex justify-end">
                    <input
                      type="number"
                      min={1}
                      max={maxFor(l)}
                      value={l.quantity}
                      disabled={expired}
                      onChange={(e) => setQty(l.productId, Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-gray-900"
                    />
                  </div>

                  <div className="col-span-3 text-right font-medium">
                    ${(l.quantity * l.unitPrice).toLocaleString()}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={expired}
                      onClick={() => removeLine(l.productId)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Agregar producto */}
          <div className="flex gap-2">
            <select
              value={addProductId}
              disabled={expired}
              onChange={(e) => setAddProductId(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Agregar un producto...</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price.toLocaleString()} (stock {p.stock})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addLine}
              disabled={!addProductId || expired}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* Entrega */}
          <div>
            <label className="text-sm font-medium text-gray-900">Fecha de entrega</label>
            <input
              type="date"
              min={tomorrowStr()}
              value={deliveryDate}
              disabled={expired}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>

          {/* Forma de pago */}
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            info={paymentInfo}
            disabled={expired}
          />

          {/* Comentarios */}
          <div>
            <label className="text-sm font-medium text-gray-900">Comentarios</label>
            <textarea
              rows={3}
              value={comments}
              disabled={expired}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ej: entregar por la mañana..."
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <p className="text-xs text-gray-500">
            Los productos que ya estaban conservan su precio. Los que agregues toman el precio de hoy.
            El total final (con tu descuento, si tenés) se calcula al guardar.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-900">
            Subtotal: <b className="text-lg">${subtotal.toLocaleString()}</b>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || expired || lines.length === 0}
            className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-gray-950 transition hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
