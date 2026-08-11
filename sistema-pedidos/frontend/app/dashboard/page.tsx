"use client";

import { useAuth } from "@/context/Auth.context";
import OrderList from "@/components/orders/OrderList";
import CreateOrderForm from "@/components/orders/CreateOrderForm";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";


export default function DashboardPage() {
  const { user, loading } = useAuth();

  const [draft, setDraft] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const openDetails = (id: number) => {
    setSelectedOrderId(id);
    setDetailsOpen(true);
  };

  const loadData = async () => {
    if (!user) return;

    setLoadingOrders(true);

    try {
      if (user.role === "admin") {
        const res = await apiFetch("/api/orders");
        const data = await res.json().catch(() => []);
        setOrders(Array.isArray(data) ? data : []);
        setDraft(null);
      } else {
        const res = await apiFetch("/api/orders/my/draft");
        const data = await res.json().catch(() => null);
        setDraft(res.ok ? data : null);
      }
    } catch {
      setOrders([]);
      setDraft(null);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) return <div className="p-6 text-gray-600">Cargando...</div>;
  if (!user) return <div className="p-6 text-red-600">No autorizado</div>;

  const isAdmin = user.role === "admin";

  const filteredOrders = orders.filter((order) => {

    const orderDate = order.createdAt ? new Date(order.createdAt) : null;

    const matchesFrom =
      !dateFrom || !orderDate
        ? true
        : orderDate >= new Date(`${dateFrom}T00:00:00`);

    const matchesTo =
      !dateTo || !orderDate
        ? true
        : orderDate <= new Date(`${dateTo}T23:59:59`);

    const q = clientFilter.trim().toLowerCase();

    const clientName =
      order.user?.name?.toLowerCase()||
      order.client?.name?.toLowerCase() ||
      "";

    const matchesClient = !q || clientName.includes(q);

    return matchesClient && matchesFrom && matchesTo;
  });

  useEffect(() => {
    const orderIdFromUrl = searchParams.get("orderId");

    if (!orderIdFromUrl)  return;
    const parsedId = Number(orderIdFromUrl);
    if (Number.isNaN(parsedId)) return;
    setSelectedOrderId(parsedId);
     setDetailsOpen(true);
    
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      {/* Header */}
      <div className="border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-2xl border border-amber-200 bg-white p-1 shadow-sm">
              <img
                src="/logo2.jpeg"
                alt="Morticia"
                className="h-14 w-14 rounded-xl object-cover md:h-20 md:w-20"
              />
            </div>

            <div className="min-w-0">
              <div className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {isAdmin ? "Panel administrativo" : "Portal de pedidos"}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-4xl">
                {isAdmin ? "Pedidos" : "Crear pedido"}
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-gray-600 md:text-base">
                {isAdmin
                  ? "Revisá pedidos recibidos, filtrá por cliente y fecha, y gestioná cada entrega de forma simple."
                  : "Armá tu pedido en borrador, revisalo y envialo al administrador cuando esté listo."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-5 md:px-6 md:py-6">
        {!isAdmin && (
          <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

            <div className="border-b bg-gradient-to-r from-white to-amber-50/60 px-5 py-4 md:px-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                    Pedido en borrador
                  </h2>
                  <p className="text-sm text-gray-600">
                    Agregá productos, revisá cantidades y enviá el pedido cuando esté listo.
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Borrador activo
                </span>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <CreateOrderForm onSent={loadData} />
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

            <div className="border-b bg-gradient-to-r from-white to-gray-50 px-4 py-4 md:px-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                      Pedidos recibidos
                    </h2>
                    <p className="text-sm text-gray-600">
                      Buscá por cliente y fecha para encontrar pedidos más rápido.
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                    {filteredOrders.length}{" "}
                    {filteredOrders.length === 1 ? "pedido" : "pedidos"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="min-w-0">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setClientFilter("");
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6">
              {loadingOrders ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                  Cargando pedidos...
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                  No hay pedidos todavía.
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
                  No hay pedidos que coincidan con los filtros.
                </div>
              ) : (
                <OrderList
                  orders={filteredOrders}
                  isAdmin={isAdmin}
                  onChanged={loadData}
                  onOpen={openDetails}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <OrderDetailsModal
        open={detailsOpen}
        orderId={selectedOrderId}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedOrderId(null);

          if (searchParams.get("orderId")) {
            router.replace("/dashboard");
          }

          loadData();
        }}
        isAdmin={isAdmin}
      />
    </div>
  );
}