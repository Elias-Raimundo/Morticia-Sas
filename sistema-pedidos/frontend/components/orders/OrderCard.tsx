"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
type OrderStatus = "draft" | "confirmed" | "delivered" | "cancelled";

interface Order {
  id: number | string;
  comments?: string | null;      // en tu schema es comments
  description?: string | null;   // por si lo venías usando
  status: OrderStatus;
  userId: number | string;
  createdAt?: string;
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


  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(Number(order.id))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(Number(order.id));
      }}
      className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition cursor-pointer min-w-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start ">
        <div className="min-w-0">
          <h3 className="font-semibold text-base md:text-lg text-gray-900 break-words">Pedido #{orderId}</h3>
          <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium border ${statusStyles[order.status]}`}
        >
          {statusLabel[order.status]}
        </span>
      </div>

      <p className="text-gray-600 text-sm break-words">
        {(order.comments ?? order.description ?? "").trim() || "Sin comentarios"}
      </p>

      {canClientEdit && (
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(Number(order.id));
            }}
            className="w-full sm:w-auto border border-yellow-200 px-3 py-2 rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-800 text-sm"
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
            className="w-full sm:w-auto border border-red-200 px-3 py-2 rounded bg-red-50 hover:bg-red-100 text-red-800 text-sm disabled:opacity-60"
          >
            {loading === "delete" ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canDeliver && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                run("deliver");
              }}
              disabled={loading !== null}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 rounded text-sm"
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
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-2 rounded text-sm"
            >
              {loading === "cancel" ? "Cancelando..." : "Cancelar"}
            </button>
          )}

          { !canDeliver && !canCancel && (
            <span className="text-sm text-gray-500">Sin acciones</span>
          )}
        </div>
      )}
    </div>
  );
}