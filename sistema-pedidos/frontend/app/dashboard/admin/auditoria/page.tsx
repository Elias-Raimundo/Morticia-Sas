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
  source?: string | null;
  userName?: string | null;
  createdAt: string;
};

const FIELD_LABELS: Record<Entry["field"], string> = {
  price: "Venta",
  internalPrice: "Costo",
  stock: "Stock",
  active: "Estado",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Edición manual",
  compra: "Compra",
  pedido: "Pedido",
  cancelacion: "Cancelación",
  edicion_pedido: "Edición de pedido",
  venta: "Venta al público",
  alta: "Alta de producto",
  baja: "Baja de producto",
  otro: "Otro",
};

const fmt = (field: Entry["field"], n: number | null) => {
  if (n === null || n === undefined) return "—";

  if (field === "active") {
    return Number(n) === 1 ? "Activo" : "Inactivo";
  }

  return field === "stock"
    ? Number(n).toLocaleString("es-AR")
    : `$${Number(n).toLocaleString("es-AR", {
        maximumFractionDigits: 2,
      })}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AuditoriaPage() {
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Recarga cuando cambia un filtro (el texto espera un momento a que termines de escribir)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (field) params.set("field", field);
        if (source) params.set("source", source);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const res = await apiFetch(`/api/products/admin/history?${params.toString()}`);
        const data = await res.json().catch(() => []);
        if (!cancelled) setEntries(res.ok && Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, field, source, from, to]);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <div className="p-5 md:p-6">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Auditoría de productos</h1>
            <p className="mt-1 text-sm text-gray-600">
              Historial de cambios de precios, costos, stock y estado de los productos.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del producto..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Campo</label>
            <select value={field} onChange={(e) => setField(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              <option value="price">Venta</option>
              <option value="internalPrice">Costo</option>
              <option value="stock">Stock</option>
              <option value="active">Estado</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Origen</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {Object.entries(SOURCE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Resultados */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-6 text-gray-600">Cargando...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-gray-500">No hay cambios registrados con esos filtros.</div>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y md:hidden">
                {entries.map((e) => (
                  <div key={e.id} className="space-y-1 p-4 text-sm">
                    <div className="font-semibold text-gray-900">{e.productName}</div>
                    <div className="text-xs text-gray-500">{fmtDate(e.createdAt)}</div>
                    <div className="text-gray-800">
                      <span className="font-medium">{FIELD_LABELS[e.field]}:</span>{" "}
                      <span className="text-gray-500">{fmt(e.field, e.oldValue)}</span>
                      {" → "}
                      <span className="font-semibold">{fmt(e.field, e.newValue)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {e.reason}
                      {e.userName ? ` · ${e.userName}` : ""}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="bg-amber-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Campo</th>
                      <th className="px-4 py-3 text-right">Valor anterior</th>
                      <th className="px-4 py-3 text-right">Valor nuevo</th>
                      <th className="px-4 py-3">Origen</th>
                      <th className="px-4 py-3">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                          {fmtDate(e.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.productName}</td>
                        <td className="px-4 py-3 text-gray-700">{FIELD_LABELS[e.field]}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{fmt(e.field, e.oldValue)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {fmt(e.field, e.newValue)}
                        </td>
                        <td className="px-4 py-3 text-gray-700" title={e.reason}>
                          {SOURCE_LABELS[e.source ?? "otro"] ?? e.reason}
                          <div className="text-xs text-gray-400">{e.reason}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{e.userName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
