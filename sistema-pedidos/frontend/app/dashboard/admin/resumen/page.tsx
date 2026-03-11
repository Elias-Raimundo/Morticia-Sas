"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ProductStat = {
  productId: number;
  productName: string;
  unitsSold: number;
  totalSold: number;
};

type StatsResponse = {
  products: ProductStat[];
};

export default function AdminResumenPage() {
  const [range, setRange] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (customUrl?: string) => {
    setLoading(true);
    try {
      const url = customUrl ?? `/api/stats/admin/products?range=${range}`;
      const res = await apiFetch(url);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "No se pudo cargar el resumen");
      }

      setData(json);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== "custom") {
      load();
    }
  }, [range]);

  const applyCustomFilter = () => {
    if (!from || !to) return;
    load(`/api/stats/admin/products?from=${from}&to=${to}`);
  };

  const totalUnits =
    data?.products?.reduce((acc, p) => acc + Number(p.unitsSold || 0), 0) ?? 0;

  const totalAmount =
    data?.products?.reduce((acc, p) => acc + Number(p.totalSold || 0), 0) ?? 0;

  const totalProducts = data?.products?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Resumen de ventas
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Consultá productos vendidos y totales por período
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hasta
                    </label>
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
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600 transition"
                  >
                    Aplicar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tarjetas */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-sm text-gray-500">Total facturado</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${Number(totalAmount).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-sm text-gray-500">Unidades vendidas</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Number(totalUnits).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-sm text-gray-500">Productos con ventas</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Number(totalProducts).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              Productos vendidos
            </h2>
            <p className="text-sm text-gray-600">
              Detalle agrupado por producto
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600">Cargando resumen...</div>
          ) : !data || !data.products?.length ? (
            <div className="p-6 text-gray-500">
              No hay ventas para este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[650px]">
                <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b bg-amber-50 text-sm font-semibold text-gray-700">
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-3 text-right">Unidades</div>
                  <div className="col-span-3 text-right">Facturado</div>
                </div>

                {data.products.map((product) => (
                  <div
                    key={product.productId}
                    className="grid grid-cols-12 gap-2 px-5 py-3 border-b text-sm items-center"
                  >
                    <div className="col-span-6 font-medium text-gray-900">
                      {product.productName}
                    </div>

                    <div className="col-span-3 text-right text-gray-700">
                      {Number(product.unitsSold).toLocaleString()}
                    </div>

                    <div className="col-span-3 text-right font-semibold text-gray-900">
                      ${Number(product.totalSold).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}