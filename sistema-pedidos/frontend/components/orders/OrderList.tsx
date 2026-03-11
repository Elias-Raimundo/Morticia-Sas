"use client";

import OrderCard from "./OrderCard";

export default function OrderList({
  orders,
  isAdmin,
  onChanged,
  onOpen,
}: {
  orders: any[];
  isAdmin: boolean;
  onChanged?: () => void;
  onOpen: (id: number) => void;
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  if (safeOrders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow text-gray-500">
        No hay pedidos todavía.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {safeOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isAdmin={isAdmin}
          onChanged={onChanged}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}