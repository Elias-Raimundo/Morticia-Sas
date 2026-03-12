"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import OrderDetailsModal from "../orders/OrderDetailsModal";

type Movement = {
  id: number;
  description: string;
  amount: number;
  createdAt: string;
  type: string;
};

type DetailData = {
  user: {
    id: number;
    name: string;
    email: string;
  };
  balance: number;
  movements: Movement[];
};

export default function ClientBalanceModal({
  open,
  userId,
  onClose,
  onChanged,
}: {
  open: boolean;
  userId: number | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [orderOpen, setOrderOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId]= useState<number | null>(null);

  const openOrder = (id:number) => {
    setSelectedOrderId(id);
    setOrderOpen(true);
  };

  const getOrderIdFromDescription = (description: string) => {
    const match = description.match(/Pedido #(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/balance/admin/${userId}`);
      const json = await res.json().catch(() => null);
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) load();
  }, [open, userId]);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  const formatDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const registerPayment = async () => {
    if (!userId) return;
    if (!amount || Number(amount) <= 0) {
      toast.warning("Ingresá un monto válido");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/balance/admin/${userId}/payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          description,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json?.error || "Error registrando pago");
        return;
      }

      setAmount("");
      setDescription("");
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-[94vw] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalle de saldo
              </h3>

              {data?.user && (
                <p className="mt-1 break-all text-sm text-gray-600">
                  {data.user.name} — {data.user.email}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="text-gray-600">Cargando...</div>
          ) : !data ? (
            <div className="text-gray-600">No se pudo cargar.</div>
          ) : (
            <>
              {/* Balance */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm text-gray-600">Balance actual</div>
                <div
                  className={`text-2xl font-bold ${
                    data.balance > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatMoney(data.balance)}
                </div>
              </div>

              {/* Registrar pago */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-3 font-semibold text-gray-900">
                  Registrar pago
                </h4>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    placeholder="Monto"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />

                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />

                  <button
                    type="button"
                    onClick={registerPayment}
                    disabled={saving}
                    className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-gray-950 hover:bg-amber-600 disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Registrar pago"}
                  </button>
                </div>
              </div>

              {/* Movimientos */}
              <div className="overflow-hidden rounded-xl border">
                {/* Mobile */}
                <div className="divide-y md:hidden">
                  {data.movements.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No hay movimientos.
                    </div>
                  ) : (
                    data.movements.map((m) => (
                      <div key={m.id} className="space-y-3 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Fecha</span>
                          <span className="font-medium text-gray-900">
                            {formatDate(m.createdAt)}
                          </span>
                        </div>

                        <div>
                          <div className="text-sm text-gray-500">Detalle</div>
                          {getOrderIdFromDescription(m.description) ? (
                            <button
                              type="button"
                              onClick={() => openOrder(getOrderIdFromDescription(m.description)!)}
                              className="text-left text-gray-900 underline underline-offset-2 hover:text-amber-700"
                            >
                              {m.description}
                            </button>
                          ) : (
                            <div className="text-gray-900">{m.description}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Monto</span>
                          <span
                            className={`font-semibold ${
                              m.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {m.amount >= 0 ? "+" : "-"}
                            {formatMoney(Math.abs(m.amount))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-2 border-b bg-amber-50 px-4 py-3 text-sm font-semibold text-gray-800">
                    <div className="col-span-2">Fecha</div>
                    <div className="col-span-7">Detalle</div>
                    <div className="col-span-3 text-right">Monto</div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {data.movements.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No hay movimientos.
                      </div>
                    ) : (
                      data.movements.map((m, idx) => (
                        <div
                          key={m.id}
                          className={`grid grid-cols-12 gap-2 border-b px-4 py-3 text-sm items-center ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          }`}
                        >
                          <div className="col-span-2 text-gray-700">
                            {formatDate(m.createdAt)}
                          </div>

                          <div className="col-span-7 text-gray-900">
                            {getOrderIdFromDescription(m.description) ? (
                              <button
                                type="button"
                                onClick={() => openOrder(getOrderIdFromDescription(m.description)!)}
                                className="text-left underline underline-offset-2 hover:text-amber-700"
                              >
                                {m.description}
                              </button>
                            ) : (
                              m.description
                            )}
                          </div>

                          <div
                            className={`col-span-3 text-right font-semibold ${
                              m.amount >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {m.amount >= 0 ? "+" : "-"}
                            {formatMoney(Math.abs(m.amount))}
                          </div>
                        </div>              
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
      <OrderDetailsModal
        open= {orderOpen}
        orderId={selectedOrderId}
        onClose={() => setOrderOpen(false)}
        isAdmin
      /> 
    </>
  );
}