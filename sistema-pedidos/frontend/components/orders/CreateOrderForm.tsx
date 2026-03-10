"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Product = {
  id: number;
  name: string;
  unit: string;
  price: number;
  stock: number;
};

type DraftItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
};

type DraftOrder = {
  id: number;
  status: "draft";
  total: number;
  deliveryDate: string | null;
  comments: string | null;
  items: DraftItem[];
};

export default function CreateOrderForm({ onSent }: { onSent?: () => void }) {
  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [comments, setComments] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const filteredProducts = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => p.name.toLowerCase().includes(s));
  }, [q, products]);

  const load = async () => {
    setLoading(true);
    try {
      const [draftRes, prodRes] = await Promise.all([
        apiFetch("/api/orders/my/draft"),
        apiFetch("/api/products"),
      ]);

      const draftData = await draftRes.json();
      const prodData = await prodRes.json();

      if (!draftRes.ok) throw new Error(draftData?.error || "No se pudo obtener draft");
      if (!prodRes.ok) throw new Error(prodData?.error || "No se pudo obtener productos");

      setDraft(draftData);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setComments(draftData.comments ?? "");
      setDeliveryDate(draftData.deliveryDate ? String(draftData.deliveryDate).slice(0, 10) : "");
    } catch (e: any) {
      toast.error(e?.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addProduct = async (productId: number) => {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/orders/${draft.id}/items`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "Error agregando");

      await load();
    } finally {
      setBusy(false);
    }
  };

  const updateQty = async (itemId: number, quantity: number) => {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/orders/${draft.id}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "Error actualizando");

      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!draft) return;
    if (!confirm("¿Eliminar este producto del pedido?")) return;

    setBusy(true);
    try {
      const res = await apiFetch(`/api/orders/${draft.id}/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "Error eliminando");

      await load();
    } finally {
      setBusy(false);
    }
  };

  const saveDraftMeta = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/orders/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          comments,
          deliveryDate: deliveryDate ? `${deliveryDate}T00:00:00` : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "Error guardando datos del pedido");

      setDraft(data);
    } finally {
      setBusy(false);
    }
  };

  const sendOrder = async () => {
    if (!draft) return;
    if (!draft.items?.length) return toast.warning("El pedido está vacío.");

    setBusy(true);
    try {
      await saveDraftMeta();

      const res = await apiFetch(`/api/orders/${draft.id}/send`, {
        method: "PATCH",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "Error enviando pedido");

      toast.success("Pedido enviado ✅");
      onSent?.();
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-gray-600">Cargando...</div>;
  if (!draft) return <div className="text-gray-600">No se pudo cargar el pedido.</div>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* LEFT */}
      <div className="min-w-0 lg:col-span-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-900">
          <h3 className="font-semibold text-white text-lg">Artículos</h3>
          <p className="text-sm text-gray-300">Elegí los artículos a pedir</p>
        </div>

        <div className="p-4">
          <input
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="Buscar producto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={busy}
          />

          <div className="mt-4 max-h-[460px] overflow-auto rounded-xl border border-gray-200">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p.id)}
                disabled={busy || p.stock === 0}
                className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-amber-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">
                      {p.name}
                    </span>

                    <span className="text-xs text-gray-500">
                      Unidad: {p.unit}
                    </span>

                    <span
                      className={`text-xs font-medium mt-1 ${
                        p.stock > 5
                          ? "text-green-600"
                          : p.stock > 0
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      Stock disponible: {p.stock}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    ${p.price.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="p-4 text-sm text-gray-500">Sin resultados</div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="min-w-0 lg:col-span-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-900 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white text-lg">Pedido</h3>
            <p className="text-sm text-gray-300">Indicá la cantidad a pedir</p>
          </div>

          <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
            Draft #{draft.id}
          </span>
        </div>

        <div className="p-4">
          {/* Fecha */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-900">
              Fecha de entrega
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              min={today}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              onBlur={saveDraftMeta}
              disabled={busy}
            />
          </div>

          {/* Tabla */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
              <div className="grid grid-cols-12 bg-amber-50 px-3 py-3 text-xs font-semibold text-gray-700 border-b">
                <div className="col-span-5">Nombre</div>
                <div className="col-span-2 text-right">Cantidad</div>
                <div className="col-span-2 text-right">$ c/u</div>
                <div className="col-span-2 text-right">Sub-total</div>
                <div className="col-span-1 text-right">X</div>
              </div>

            {draft.items?.length ? (
              draft.items.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-12 px-3 py-3 border-b text-sm items-center text-gray-900"
                >
                  <div className="col-span-5">
                    <div className="font-medium">
                      {it.product?.name ?? `Producto #${it.productId}`}
                    </div>
                    {it.product?.unit && (
                      <div className="text-xs text-gray-500 mt-1">
                        Unidad: {it.product.unit}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <input
                      type="number"
                      min={1}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-gray-900"
                      value={it.quantity}
                      disabled={busy}
                      onChange={(e) => updateQty(it.id, Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2 text-right font-medium text-gray-800">
                    ${Number(it.unitPrice).toLocaleString()}
                  </div>

                  <div className="col-span-2 text-right font-semibold text-gray-900">
                    ${Number(it.subtotal).toLocaleString()}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500">
                Todavía no agregaste productos.
              </div>
            )}
          </div>
        </div>
      </div>

          {/* Comentarios */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-900">
              Comentarios
            </label>
            <textarea
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              onBlur={saveDraftMeta}
              disabled={busy}
              placeholder="Ej: entregar por la mañana..."
            />
          </div>

          {/* Total + enviar */}
          <div className="mt-5 flex flex-col items-stretch gap-4 sm:items-center sm:justify-between">
            <div className="text-sm text-gray-900">
              Total:{" "}
              <b className="text-lg text-gray-900">
                ${Number(draft.total ?? 0).toLocaleString()}
              </b>
            </div>

            <button
              type="button"
              onClick={sendOrder}
              disabled={busy || !draft.items?.length}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-semibold px-5 py-3 transition disabled:opacity-50"
            >
              {busy ? "Procesando..." : "Enviar pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}