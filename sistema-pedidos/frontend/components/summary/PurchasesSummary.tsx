"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type ProductPurchase = {
  productId: number;
  productName: string;
  unitsBought: number;
  totalSpent: number;
  avgUnitCost: number;
};

type ProviderPurchase = {
  providerId: number;
  providerName: string;
  invoicesCount: number;
  total: number;
};

type PurchasesByDay = { date: string; total: number; invoices: number };

type PurchasesResponse = {
  products: ProductPurchase[];
  providers: ProviderPurchase[];
  purchasesByDay: PurchasesByDay[];
  byPaymentType: { completo: number; cuotas: number; fiado: number };
  totalAmount: number;
  invoicesCount: number;
  providersCount: number;
  averageInvoice: number;
};

const money = (n: number) => `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

const formatLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatLocalDateFull = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-AR");
};

export default function PurchasesSummary() {
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PurchasesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (customUrl?: string) => {
    setLoading(true);
    try {
      const url = customUrl ?? `/api/stats/admin/purchases?range=${range}`;
      const res = await apiFetch(url);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar el resumen de compras");
      setData(json);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== "custom") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const applyCustomFilter = () => {
    if (!from || !to) return;
    load(`/api/stats/admin/purchases?from=${from}&to=${to}`);
  };

  const totalUnits = data?.products?.reduce((acc, p) => acc + Number(p.unitsBought || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <div className="p-5 md:p-6">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Resumen de compras</h1>
            <p className="mt-1 text-sm text-gray-600">
              Lo que compraste a tus proveedores en el período, según las facturas cargadas
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Período</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {range === "custom" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustomFilter}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-amber-600"
                >
                  Aplicar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tarjetas */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total comprado</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{money(data?.totalAmount ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Facturas del período</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Number(data?.invoicesCount ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Unidades compradas</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{Number(totalUnits).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Factura promedio</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{money(data?.averageInvoice ?? 0)}</p>
          </div>
        </div>

        {/* Forma de pago de las facturas */}
        {data && data.invoicesCount > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
              Pago completo: {money(data.byPaymentType.completo)}
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
              En cuotas: {money(data.byPaymentType.cuotas)}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
              Fiado: {money(data.byPaymentType.fiado)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
              {data.providersCount} {data.providersCount === 1 ? "proveedor" : "proveedores"}
            </span>
          </div>
        )}

        {/* Productos comprados */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Productos comprados</h2>
            <p className="text-sm text-gray-600">Detalle agrupado por producto</p>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Cargando resumen...</div>
          ) : !data || !data.products?.length ? (
            <div className="p-6 text-gray-500">No hay compras para este período.</div>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y md:hidden">
                {data.products.map((p) => (
                  <div key={p.productId} className="space-y-2 p-4">
                    <div className="font-semibold text-gray-900">{p.productName}</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Unidades</span>
                      <span className="font-medium text-gray-900">{Number(p.unitsBought).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Costo promedio</span>
                      <span className="font-medium text-gray-900">{money(p.avgUnitCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Gastado</span>
                      <span className="font-semibold text-gray-900">{money(p.totalSpent)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-12 gap-2 border-b bg-amber-50 px-5 py-3 text-sm font-semibold text-gray-700">
                    <div className="col-span-5">Producto</div>
                    <div className="col-span-2 text-right">Unidades</div>
                    <div className="col-span-2 text-right">Costo prom.</div>
                    <div className="col-span-3 text-right">Gastado</div>
                  </div>
                  {data.products.map((p) => (
                    <div
                      key={p.productId}
                      className="grid grid-cols-12 items-center gap-2 border-b px-5 py-3 text-sm"
                    >
                      <div className="col-span-5 font-medium text-gray-900">{p.productName}</div>
                      <div className="col-span-2 text-right text-gray-700">
                        {Number(p.unitsBought).toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right text-gray-700">{money(p.avgUnitCost)}</div>
                      <div className="col-span-3 text-right font-semibold text-gray-900">
                        {money(p.totalSpent)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Por proveedor */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Compras por proveedor</h2>
            <p className="text-sm text-gray-600">Cuánto le compraste a cada uno</p>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Cargando...</div>
          ) : !data?.providers?.length ? (
            <div className="p-6 text-gray-500">No hay compras para este período.</div>
          ) : (
            <div className="divide-y">
              {data.providers.map((p) => (
                <div key={p.providerId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="break-words font-medium text-gray-900">{p.providerName}</div>
                    <div className="text-xs text-gray-500">
                      {p.invoicesCount} {p.invoicesCount === 1 ? "factura" : "facturas"}
                    </div>
                  </div>
                  <div className="font-semibold text-gray-900">{money(p.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Compras por día</h2>
            <p className="text-sm text-gray-600">Evolución del período seleccionado</p>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Cargando gráfico...</div>
          ) : !data?.purchasesByDay?.length ? (
            <div className="p-6 text-gray-500">No hay datos para mostrar en el gráfico.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.purchasesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => formatLocalDate(v)} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                    }}
                    labelStyle={{ color: "#000", fontWeight: 700 }}
                    itemStyle={{ color: "#374151" }}
                    formatter={(value) => money(Number(value))}
                    labelFormatter={(label) => formatLocalDateFull(String(label))}
                  />
                  <Line type="monotone" dataKey="total" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
