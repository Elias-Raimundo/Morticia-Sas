"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Detalle de saldo
            </h3>
            {data?.user && (
              <p className="text-sm text-gray-600">
                {data.user.name} — {data.user.email}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="text-gray-600">Cargando...</div>
          ) : !data ? (
            <div className="text-gray-600">No se pudo cargar.</div>
          ) : (
            <>
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

              <div className="rounded-xl border p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Registrar pago
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 font-medium px-4 py-2 disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : "Registrar pago"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b font-semibold text-sm bg-amber-50 text-gray-800">
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-7">Detalle</div>
                  <div className="col-span-3 text-right">Monto</div>
                </div>
                <div className = "max-h-80 overflow-y-auto"></div>
                {data.movements.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    No hay movimientos.
                  </div>
                ) : (
                  data.movements.map((m, idx) => (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}