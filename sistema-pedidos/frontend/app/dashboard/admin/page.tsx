"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ClientBalanceModal from "@/components/balance/ClientBalanceModal";

type ClientBalance = {
  id: number;
  name: string;
  email: string;
  balance: number;
};

export default function AdminPage() {
  const [items, setItems] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/balance/admin/clients");
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
          <p className="mt-1 text-sm text-gray-700">
            Balance actual de cada cliente.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b font-semibold text-sm bg-amber-50 text-gray-800">
          <div className="col-span-3">Cliente</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-3 text-right">Balance</div>
            <div className="col-span-2 text-right">Accion </div> 
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-600">No hay clientes.</div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
              }`}
            >
              <div className="col-span-4 font-medium text-gray-900">
                {item.name}
              </div>

              <div className="col-span-5 text-gray-700">
                {item.email}
              </div>

              <div
                className={`col-span-3 text-right font-semibold ${
                  item.balance > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatMoney(item.balance)}
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                    className = "rounded-lg border border-amber-300 text-amber-700 px-3 py-1 text-sm hover:bg-amber-50"
                  onClick={() => {
                    setSelectedClientId(item.id);
                    setDetailsOpen(true);
                  }}
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <ClientBalanceModal
        open ={detailsOpen}
        userId={selectedClientId}
        onClose={() => setDetailsOpen(false)}
        onChanged = {load}
    />
    </div>
  );
}