"use client";

import { useAuth } from "@/context/Auth.context";
import OrderList from "@/components/orders/OrderList";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function HistorialPage() {
  const { user, loading } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [clientFilter, setClientFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const openDetails = (id: number) => {
    setSelectedOrderId(id);
    setDetailsOpen(true);
  };

  const loadOrders = async () => {
    if (!user) return;

    setLoadingOrders(true);
    try {
      const endpoint = user.role === "admin" ? "/api/orders" : "/api/orders/my";
      const res = await apiFetch(endpoint);
      const data = await res.json().catch(() => []);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  if (loading) return <div className="p-6 text-gray-600">Cargando...</div>;
  if (!user) return <div className="p-6 text-red-600">No autorizado</div>;

  const isAdmin = user.role === "admin";

  

  const filteredOrders = orders.filter((order) => {
    
    const matchesClient = 
    !clientFilter ||
    order.user?.name?.toLowerCase().includes(clientFilter.toLowerCase())||
    order.client?.name?.toLowerCase().includes(clientFilter.toLowerCase());

    const orderDate = order.createdAt ? new Date(order.createdAt) : null;

    const matchesFrom =
      !dateFrom || !orderDate
        ? true
        : orderDate >= new Date(`${dateFrom}T00:00:00`);

    const matchesTo =
      !dateTo || !orderDate
        ? true
        : orderDate <= new Date(`${dateTo}T23:59:59`);

    if (!isAdmin) {
      return matchesFrom && matchesTo;
    }

    return matchesFrom && matchesTo && matchesClient;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 md:py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {isAdmin ? "Pedidos" : "Historial"}
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            {isAdmin
              ? "Revisá pedidos recibidos, cancelalos o marcalos como entregados."
              : "Consultá tus pedidos ya enviados."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 md:py-6">
        <section className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <div className="px-4 md:px-6 py-4 border-b bg-gray-50 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isAdmin ? "Pedidos" : "Historial"}
                </h2>
                <p className="text-sm text-gray-600">
                  {isAdmin ? "Listado de pedidos recibidos" : "Tus pedidos ya enviados"}
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
                {filteredOrders.length} {filteredOrders.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${ isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {isAdmin && (
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              )}

              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div className="min-w-0 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin)  setClientFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {loadingOrders ? (
              <div className="text-gray-600">Cargando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                No hay pedidos todavía.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                No hay pedidos que coincidan con los filtros.
              </div>
            ) : (
              <OrderList
                orders={filteredOrders}
                isAdmin={isAdmin}
                onChanged={loadOrders}
                onOpen={openDetails}
              />
            )}
          </div>
        </section>
      </div>

      <OrderDetailsModal
        open={detailsOpen}
        orderId={selectedOrderId}
        onClose={() => {
          setDetailsOpen(false);
          loadOrders();
        }}
        isAdmin={isAdmin}
      />
    </div>
  );
}