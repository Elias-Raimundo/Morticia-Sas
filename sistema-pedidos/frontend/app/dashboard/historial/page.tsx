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

  const [statusFilter, setStatusFilter] = useState("all");
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
    const matchesStatus =
      statusFilter === "all" ? true : order.status === statusFilter;

    const orderDate = order.createdAt ? new Date(order.createdAt) : null;

    const matchesFrom =
      !dateFrom || !orderDate
        ? true
        : orderDate >= new Date(`${dateFrom}T00:00:00`);

    const matchesTo =
      !dateTo || !orderDate
        ? true
        : orderDate <= new Date(`${dateTo}T23:59:59`);

    return matchesStatus && matchesFrom && matchesTo;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? "Pedidos" : "Historial"}
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            {isAdmin
              ? "Revisá pedidos recibidos, cancelalos o marcalos como entregados."
              : "Consultá tus pedidos ya enviados."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <section className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isAdmin ? "Pedidos" : "Historial"}
              </h2>
              <p className="text-sm text-gray-600">
                {isAdmin ? "Listado de pedidos recibidos" : "Tus pedidos ya enviados"}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="all">Todos</option>
                <option value="confirmed">Confirmados</option>
                <option value="delivered">Entregados</option>
                <option value="cancelled">Cancelados</option>
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />

              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Limpiar filtros
              </button>

              <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
                {filteredOrders.length} {filteredOrders.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
          </div>

          <div className="p-6">
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