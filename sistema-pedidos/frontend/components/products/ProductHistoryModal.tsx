"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Entry = {
  id: number;
  productId: number;
  productName: string;
  field: "price" | "internalPrice" | "stock" | "active";
  oldValue: number | null;
  newValue: number | null;
  reason: string;
  userName?: string | null;
  createdAt: string;
};

const FIELD_LABELS: Record<Entry["field"], string> = {
  price: "Precio de venta",
  internalPrice: "Costo interno",
  stock: "Stock",
  active: "Estado",
};

const money = (n: number | null) =>
  n === null || n === undefined
    ? "—"
    : `$${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

type Tab = "all" | "prices" | "stock";

export default function ProductHistoryModal({
  product,
  onClose,
}: {
  product: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const productId = product?.id ?? null;
  const loading = productId !== null && loadedFor !== productId;

  useEffect(() => {
    if (productId === null) return;
    let cancelled = false;
    apiFetch(`/api/products/admin/${productId}/history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => !cancelled && setEntries(Array.isArray(data) ? data : []))
      .catch(() => !cancelled && setEntries([]))
      .finally(() => !cancelled && setLoadedFor(productId));
    return () => {
      cancelled = true;
      setLoadedFor(null);
    };
  }, [productId]);

  const close = () => {
    setTab("all");
    onClose();
  };

  if (!product) return null;

  const visible = entries.filter((e) =>
    tab === "all" ? true : tab === "stock" ? e.field === "stock" : e.field === "price" || e.field === "internalPrice"
  );

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1 text-sm font-medium transition ${
      active ? "bg-amber-500 text-gray-950" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={close} />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Historial de cambios</h3>
            <p className="break-words text-sm text-gray-700">{product.name}</p>
          </div>
          <button
            onClick={close}
            className="rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <div className="flex gap-2 border-b bg-gray-50 px-5 py-3">
          <button className={tabClass(tab === "all")} onClick={() => setTab("all")}>
            Todo
          </button>
          <button className={tabClass(tab === "prices")} onClick={() => setTab("prices")}>
            Precios
          </button>
          <button className={tabClass(tab === "stock")} onClick={() => setTab("stock")}>
            Stock
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="p-5 text-sm text-gray-600">Cargando historial...</div>
          ) : visible.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">Todavía no hay cambios registrados.</div>
          ) : (
            <div className="divide-y">
              {visible.map((e) => {
                const isStock = e.field === "stock";
                const isActive = e.field === "active";
                const show = (n: number | null) =>
                  isActive ? (n === null ? "—" : Number(n) === 1 ? "Activo" : "Inactivo") : isStock ? (n ?? "—") : money(n);
                const delta = isStock ? (e.newValue ?? 0) - (e.oldValue ?? 0) : 0;
                return (
                  <div key={e.id} className="space-y-1 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">{FIELD_LABELS[e.field]}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(e.createdAt).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="text-gray-800">
                      <span className="text-gray-500">
                        {show(e.oldValue)}
                      </span>
                      {" → "}
                      <span className="font-semibold">
                        {show(e.newValue)}
                      </span>
                      {isStock && delta !== 0 && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            delta > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      {e.reason}
                      {e.userName ? ` · ${e.userName}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
