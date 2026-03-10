"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Item = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: { name: string; unit?:string } | null;
};

type Order = {
  id: number;
  status: string;
  total: number;
  createdAt?: string | null;
  deliveryDate?: string | null;
  comments?: string | null;
  user?: { 
    name?: string;
    lastName?: string; 
    email?: string;
    phone?: string;
    dniCuil?: string;
    address?: string;
  } | null;
  items?: Item[];
};

export default function OrderDetailsModal({
  orderId,
  open,
  onClose,
  isAdmin,
}: {
  orderId: number | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading]=useState(false);

  // acciones por item
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  const canEditDraft = useMemo(() => {
    return !isAdmin && order?.status === "draft";
  }, [isAdmin, order?.status]);

  const fetchOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    const path = isAdmin
      ? `/api/orders/${orderId}`
      : `/api/orders/my/${orderId}`;

    try {
      const r = await apiFetch(path);
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setOrder(null);
        return;
      }
      setOrder(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !orderId) return;
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, isAdmin]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    sent: "Enviado",
    confirmed: "Confirmado",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  const updateQty = async (itemId: number, qty: number) => {
    if (!orderId) return;
    
    const q = Number(qty);
    if (!q || q <= 0) {
      toast.error("Cantidad inválida");
      return;
    }

    setSavingItemId(itemId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: q }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo actualizar la cantidad");
        return;
      }

      await fetchOrder(); // refrescar total y subtotales
    } catch {
      toast.error("Error de red");
    } finally {
      setSavingItemId(null);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!orderId) return;

    if (!confirm("¿Quitar este producto del pedido?")) return;

    setRemovingItemId(itemId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo eliminar el producto");
        return;
      }

      await fetchOrder();
    } catch {
      toast.error("Error de red");
    } finally {
      setRemovingItemId(null);
    }
  };

  const viewPdf = async () => {
    if (!orderId) return;
    try{
      const path = isAdmin
      ? `/api/orders/${orderId}/pdf`
      : `/api/orders/my/${orderId}/pdf`;
      const res = await apiFetch(path);

      if (!res.ok){
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "No se pudo cargar el PDF");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    }catch{
      toast.error("Error cargando el PDF");
    }
  };

  const downloadPDF = async () => {
    if (!orderId) return;

    setDownloading(true);
    try{
      const path = isAdmin
      ? `/api/orders/${orderId}/pdf`
      : `/api/orders/my/${orderId}/pdf`;
      const res = await apiFetch(path);

      if (!res.ok){
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "No se pudo descargar el PDF");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }catch{
      toast.error("Error descargando el PDF");
    }finally{
      setDownloading(false);
    }
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-h-[90vh] rounden-2xl bg-white shadow-2xl overflow-hidden border border-gray-200 flex flex-col animate-modalIn_.18s_ease-out]">
        <div className="p-5 border-b flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Detalle del pedido</h3>
            {order?.id && (
              <p className="text-sm text-gray-800">Pedido #{order.id}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={viewPdf}
              disabled={!orderId}
              className="rounded-lg border border-amber-300 text-amber-700 px-3 py-1 text-sm hover:bg-amber-50 disabled:opacity-60"
              >
                Ver PDF
              </button>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>

        <div className="p-5 text-gray-900 overflow-y-auto">
          {loading ? (
            <div className="text-gray-600">Cargando...</div>
          ) : !order ? (
            <div className="text-gray-600">No se pudo cargar.</div>
          ) : (
            <>
              {isAdmin && order.user && (
                <div className="mb-4 text-sm text-gray-800">
                  <div>
                    <b>Cliente:</b> {order.user.name}
                  </div>
                  <div>
                    <b>Email:</b> {order.user.email}
                  </div>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <span className="inline-block text-xs bg-gray-100  text-gray-700 border border-gray-300 px-2 py-1 rounded-full">
                  {statusLabel[order.status]}
                </span>

                {canEditDraft && (
                  <span className="text-xs text-gray-600">
                    Podés editar porque está en <b>draft</b>
                  </span>
                )}
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-100 p-3 text-xs font-semibold text-gray-700">
                  <div className="col-span-5">Producto</div>
                  <div className="col-span-3 text-right">Cant</div>
                  <div className="col-span-2 text-right">Precio</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {order.items?.map((it) => (
                  <div
                    key={it.id}
                    className="grid grid-cols-12 p-3 border-t text-sm items-center gap-2 text-gray-900"
                  >
                    <div className="col-span-5 font-medium text-gray-900">
                      {it.product?.name ?? `Producto #${it.productId}`}
                    </div>

                    <div className="col-span-3 flex justify-end items-center gap-2">
                      {canEditDraft ? (
                        <>
                          <input
                            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-gray-900"
                            type="number"
                            min={1}
                            defaultValue={it.quantity}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = Number(
                                  (e.target as HTMLInputElement).value
                                );
                                updateQty(it.id, v);
                              }
                            }}
                          />

                          <button
                            className="text-xs border border-gray-300 rounded-md px-2 py-1  text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                            disabled={savingItemId === it.id}
                            onClick={() => {
                              const el = document.activeElement as HTMLInputElement | null;
                              // si no está enfocado el input, igual tomamos el qty actual del item
                              const v = el?.type === "number" ? Number(el.value) : it.quantity;
                              updateQty(it.id, v);
                            }}
                          >
                            {savingItemId === it.id ? "..." : "Guardar"}
                          </button>

                          <button
                            className="text-xs border border-red-200 text-red-700 rounded-md px-2 py-1 hover:bg-red-50 disabled:opacity-60"
                            disabled={removingItemId === it.id}
                            onClick={() => removeItem(it.id)}
                          >
                            {removingItemId === it.id ? "..." : "Quitar"}
                          </button>
                        </>
                      ) : (
                        <div className="text-right w-full text-gray-800">{it.quantity}</div>
                      )}
                    </div>

                    <div className="col-span-2 text-right text-gray-800">
                      ${it.unitPrice}
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900">
                      ${it.subtotal}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right text-sm text-gray-900">
                <b>Total:</b> ${String(order.total)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}