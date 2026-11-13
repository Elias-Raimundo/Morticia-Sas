"use client";

export type PaymentMethodId = "transferencia" | "efectivo" | "qr";

export type PaymentInfo = {
  editWindowMinutes: number;
  methods: {
    id: PaymentMethodId;
    label: string;
    alias?: string | null;
    holder?: string | null;
    qrUrl?: string | null;
  }[];
};

export const PAYMENT_LABELS: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  qr: "QR",
};

const FALLBACK_METHODS: PaymentInfo["methods"] = [
  { id: "transferencia", label: "Transferencia" },
  { id: "efectivo", label: "Efectivo" },
  { id: "qr", label: "QR" },
];

export default function PaymentMethodPicker({
  value,
  onChange,
  info,
  disabled,
}: {
  value: string;
  onChange: (v: PaymentMethodId) => void;
  info: PaymentInfo | null;
  disabled?: boolean;
}) {
  const methods = info?.methods?.length ? info.methods : FALLBACK_METHODS;
  const selected = methods.find((m) => m.id === value);

  const copyAlias = async (alias: string) => {
    try {
      await navigator.clipboard.writeText(alias);
    } catch {
      /* sin permiso de portapapeles: el alias queda visible igual */
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-900">Forma de pago</label>

      <div className="mt-1 grid grid-cols-3 gap-2">
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
                active
                  ? "border-amber-500 bg-amber-100 text-gray-950 ring-2 ring-amber-300"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {selected?.id === "transferencia" && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
          {selected.alias ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Alias: <b className="select-all">{selected.alias}</b>
              </span>
              <button
                type="button"
                onClick={() => copyAlias(selected.alias as string)}
                className="rounded-lg border border-amber-300 bg-white px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100"
              >
                Copiar
              </button>
              {selected.holder && <span className="text-gray-600">· {selected.holder}</span>}
            </div>
          ) : (
            <span>Te pasamos el alias para transferir cuando confirmemos el pedido.</span>
          )}
        </div>
      )}

      {selected?.id === "qr" && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
          {selected.qrUrl ? (
            <img
              src={selected.qrUrl}
              alt="QR de pago"
              className="mx-auto h-44 w-44 rounded-lg border border-gray-200 bg-white object-contain"
            />
          ) : (
            <span>Pagás escaneando el QR al momento de la entrega.</span>
          )}
        </div>
      )}

      {selected?.id === "efectivo" && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
          Pagás en efectivo al recibir el pedido.
        </div>
      )}
    </div>
  );
}
