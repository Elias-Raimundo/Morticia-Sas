"use client";

import { useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

type Month = { id: number; period: string; paid: boolean; paidAt: string };
type Current = { state: "ok" | "warning" | "readonly"; period: string; monthName: string };

const STATE_LABEL = {
  ok: "Funcionando normal",
  warning: "Aviso de vencimiento (solo lo ve el admin)",
  readonly: "Modo solo lectura",
};

// Panel privado del dueño del sistema: no está enlazado en ningún menú y pide una clave
// que solo existe en el servidor.
export default function OwnerPage() {
  const [key, setKey] = useState("");
  const [current, setCurrent] = useState<Current | null>(null);
  const [months, setMonths] = useState<Month[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const call = async (method: "GET" | "POST", body?: object) => {
    const res = await fetch(`${BASE_URL}/api/billing/owner/months`, {
      method,
      headers: { "Content-Type": "application/json", "x-owner-key": key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Error");
    return data;
  };

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await call("GET");
      setCurrent(data.current);
      setMonths(data.months);
    } catch (e) {
      setCurrent(null);
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const setPaid = async (period: string, paid: boolean) => {
    setBusy(true);
    setError("");
    try {
      await call("POST", { period, paid });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  };

  const currentPaid = current ? months.some((m) => m.period === current.period && m.paid) : false;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold text-gray-900">Mensualidad del sistema</h1>

      {!current ? (
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Clave"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
          <button
            onClick={load}
            disabled={busy || !key}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-gray-950 disabled:opacity-50"
          >
            Entrar
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border bg-white p-4">
            <div className="text-sm text-gray-600">Mes en curso: {current.monthName} ({current.period})</div>
            <div className="font-semibold text-gray-900">
              {currentPaid ? "Pagado" : "Sin pagar"} · {STATE_LABEL[current.state]}
            </div>
            <button
              onClick={() => setPaid(current.period, !currentPaid)}
              disabled={busy}
              className={`rounded-lg px-4 py-2 font-semibold disabled:opacity-50 ${
                currentPaid ? "border border-red-300 text-red-700" : "bg-green-600 text-white"
              }`}
            >
              {currentPaid ? `Quitar el pago de ${current.monthName}` : `Marcar ${current.monthName} como pagado`}
            </button>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-gray-900">Últimos meses cargados</div>
            {months.length === 0 ? (
              <div className="text-sm text-gray-500">Todavía no hay meses cargados.</div>
            ) : (
              <ul className="divide-y text-sm text-gray-900">
                {months.map((m) => (
                  <li key={m.id} className="flex justify-between py-1.5">
                    <span>{m.period}</span>
                    <span>{m.paid ? "Pagado" : "Sin pagar"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
