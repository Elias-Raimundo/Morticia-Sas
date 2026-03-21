"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

interface OrderItem{
  id: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
  };
}

interface Order {
  id: number | string;
  comments?: string | null;      // en tu schema es comments
  description?: string | null;   // por si lo venías usando
  status: OrderStatus;
  userId: number | string;
  createdAt?: string;
  total?: number;
  user?:{
    name?: string;
    email?: string;
  };
  client?:{
    name?: string;
    email?: string;
  };
  items?:OrderItem[];
}

const statusLabel: Record<OrderStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const statusStyles: Record<OrderStatus, string> = {
  draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  delivered: "bg-gray-50 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function formatDate(value?: string) {
  if (!value) return "Fecha desconocida";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function OrderCard({
  order,
  isAdmin,
  onChanged,
  onOpen,
}: {
  order: Order;
  isAdmin: boolean;
  onChanged?: () => void;
  onOpen: (id: number) => void;
}) {
  const [loading, setLoading] = useState<null | "confirm" | "cancel" | "deliver" | "delete" >(null);

  const orderId = String(order.id);

  const run = async (action: "confirm" | "cancel" | "deliver") => {
    try {
      setLoading(action);

      const res = await apiFetch(`/api/orders/${orderId}/${action}`, {
        method: "PATCH",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || "Error realizando la acción");
        return;
      }

      toast.success(action === "deliver" ? "Pedido entregado ✅" : "Pedido cancelado");

      onChanged?.();
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(null);
    }
  };

  const deleteDraft = async() =>{
    try {
      setLoading("delete");
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        toast.error(data?.error || "Error eliminando el pedido");
        return;
      }
      toast.success("Pedido eliminado");
      onChanged?.();

    }catch{
      toast.error("Error de red");
    }finally{
      setLoading(null);
    }
  };


  const canDeliver = isAdmin && order.status === "confirmed";
  const canCancel = isAdmin && (order.status === "confirmed") ;
  const isDraft = order.status === "draft";
  const canClientEdit = !isAdmin && isDraft;

  const clientName = order.user?.name || order.client?.name || "Cliente";

  const totalUnits =
    order.items?.reduce((acc, item) => acc + Number(item.quantity || 0), 0) ?? 0;

  const previewItems = order.items?.slice(0, 3) ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(Number(order.id))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(Number(order.id));
      }}
      className="group min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    >
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {isAdmin ? (
                <>
                  <h3 className="break-words text-lg font-bold tracking-tight text-gray-900">
                    {clientName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Pedido #{orderId} · {formatDate(order.createdAt)}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="break-words text-lg font-bold tracking-tight text-gray-900">
                    Pedido #{orderId}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                </>
              )}
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${statusStyles[order.status]}`}
            >
              {statusLabel[order.status]}
            </span>
          </div>

          {/* Resume */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50/70 p-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Total
              </p>
              <p className="text-lg font-bold text-gray-900">
                ${Number(order.total ?? 0).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Unidades
              </p>
              <p className="text-base font-bold text-gray-900">
                {Number(totalUnits).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Productos */}
          {previewItems.length > 0 && (
            <div className="rounded-2xl bg-gray-50/80 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Productos
              </p>

              <div className="space-y-1 text-sm text-gray-700">
                {previewItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-700">
                    • {item.product?.name ?? `Producto #${item.id}`} x{item.quantity}
                  </div>
                ))}

                {(order.items?.length ?? 0) > 3 && (
                  <div className="text-xs text-gray-500">
                    +{(order.items?.length ?? 0) - 3} producto(s) más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comentarios */}
          <div className="rounded-2xl bg-gray-50/80 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Comentarios
            </p>
            <p className="break-words text-sm text-gray-700">
              {(order.comments ?? order.description ?? "").trim() || "Sin comentarios"}
            </p>
          </div>

          {/* Client actions */}
          {canClientEdit && (
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(Number(order.id));
                }}
                className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm font-medium text-yellow-800 transition hover:bg-yellow-100 sm:w-auto"
              >
                Editar
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("¿Eliminar este pedido?")) return;
                  await deleteDraft();
                }}
                disabled={loading === "delete"}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-60 sm:w-auto"
              >
                {loading === "delete" ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(Number(order.id));
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                Ver detalle
              </button>

              {canDeliver && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    run("deliver");
                  }}
                  disabled={loading !== null}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
                >
                  {loading === "deliver" ? "Entregando..." : "Entregar"}
                </button>
              )}

              {canCancel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    run("cancel");
                  }}
                  disabled={loading !== null}
                  className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
                >
                  {loading === "cancel" ? "Cancelando..." : "Cancelar"}
                </button>
              )}

              {!canDeliver && !canCancel && (
                <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                  Sin acciones
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}