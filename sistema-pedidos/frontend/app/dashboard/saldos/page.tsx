"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Movement = {
  id: number;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
};

export default function BalancePage() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await apiFetch(`/api/balance/my?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Error cargando saldo");
        return;
      }

      setBalance(Number(data.balance ?? 0));
      setMovements(Array.isArray(data.movements) ? data.movements : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Saldos</h1>
          <p className="mt-1 text-sm text-gray-700">
            Consultá tu balance y el historial de movimientos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6">
          <p className="text-sm text-gray-500">Balance actual</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 break-words">
            {formatMoney(balance)}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Positivo = deuda pendiente
          </p>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className = "min-w-0">
              <label className="block text-sm text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div className = "min-w-0">
              <label className="block text-sm text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <div className ="min-w-0 flex items-end">
            <button
              type="button"
              onClick={load}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 font-medium px-4 py-2 self-end"
            >
              Filtrar
            </button>
            </div>

            <div className ="min-w-0 flex items-end">
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 self-end"
            >
              Limpiar
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Movimientos</h2>
            <p className="text-sm text-gray-600">
              Historial de cargos y pagos
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
            {movements.length} {movements.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : movements.length === 0 ? (
          <div className="p-6 text-gray-600">No hay movimientos.</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y md:hidden">
              {movements.map((m) => (
                <div key={m.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Fecha</span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(m.createdAt)}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500">Detalle</div>
                    <div className="text-gray-900">{m.description}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Monto</span>
                    <span
                      className={`font-semibold ${
                        m.amount >= 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {m.amount >= 0 ? "+" : ""}
                      {formatMoney(m.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b font-semibold text-sm bg-amber-50 text-gray-800">
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-7">Detalle</div>
                  <div className="col-span-3 text-right">Monto</div>
                </div>

                {movements.map((m, idx) => (
                  <div
                    key={m.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    }`}
                  >
                    <div className="col-span-2 text-gray-700">
                      {formatDate(m.createdAt)}
                    </div>

                    <div className="col-span-7 text-gray-900">
                      {m.description}
                    </div>

                    <div
                      className={`col-span-3 text-right font-semibold ${
                        m.amount >= 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {m.amount >= 0 ? "+" : ""}
                      {formatMoney(m.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}