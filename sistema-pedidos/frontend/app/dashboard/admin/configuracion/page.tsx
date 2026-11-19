"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ListSkeleton } from "@/components/ui/Skeleton";

type PaymentConfig = {
  alias: string | null;
  holder: string | null;
  qrUrl: string | null;
};

export default function ConfiguracionPage() {
  const confirmDialog = useConfirm();
  const [alias, setAlias] = useState("");
  const [holder, setHolder] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);

  const apply = (c: PaymentConfig) => {
    setAlias(c.alias ?? "");
    setHolder(c.holder ?? "");
    setQrUrl(c.qrUrl ?? null);
  };

  useEffect(() => {
    apiFetch("/api/settings/stock")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setThreshold(String(c.threshold)))
      .catch(() => {});
  }, []);

  const saveThreshold = async () => {
    const n = Number(threshold);
    if (threshold.trim() === "" || !Number.isInteger(n) || n < 0) {
      return toast.warning("Ingresá un número entero, 0 o mayor.");
    }
    setSavingThreshold(true);
    try {
      const res = await apiFetch("/api/settings/stock", {
        method: "PUT",
        body: JSON.stringify({ threshold: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "No se pudo guardar");
      setThreshold(String(data.threshold));
      toast.success("Mínimo de stock guardado");
    } catch {
      toast.error("Error de red");
    } finally {
      setSavingThreshold(false);
    }
  };

  useEffect(() => {
    apiFetch("/api/settings/payment")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && apply(c))
      .catch(() => toast.error("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/payment", {
        method: "PUT",
        body: JSON.stringify({ alias: alias.trim(), holder: holder.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "No se pudo guardar");
      apply(data);
      toast.success("Datos de pago guardados");
    } catch {
      toast.error("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const uploadQr = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/api/settings/payment/qr", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data?.error || "No se pudo subir el QR");
      apply(data);
      toast.success("QR actualizado");
    } catch {
      toast.error("Error de red");
    } finally {
      setUploading(false);
    }
  };

  const removeQr = async () => {
    const ok = await confirmDialog({
      title: "¿Quitar el QR?",
      message: "Los clientes dejarán de verlo al elegir QR.",
      confirmText: "Quitar",
      danger: true,
    });
    if (!ok) return;
    const res = await apiFetch("/api/settings/payment/qr", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error || "No se pudo quitar el QR");
    apply(data);
    toast.success("QR quitado");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          <div className="p-5 md:p-6">
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="mt-1 text-sm text-gray-600">
              Datos de pago que ven los clientes y aviso de stock bajo
            </p>
          </div>
        </div>

        {loading ? (
          <ListSkeleton className="py-2" />
        ) : (
          <>
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Transferencia</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Alias</label>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="ej: morticia.mp"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Titular de la cuenta (opcional)
                </label>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Nombre del titular"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">QR de pago</h2>
              <p className="text-sm text-gray-600">
                Subí la imagen del QR de cobro de tu billetera o banco (JPG, PNG o WEBP, hasta 5 MB).
              </p>

              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="QR de pago"
                  className="h-48 w-48 rounded-xl border border-gray-200 bg-white object-contain"
                />
              ) : (
                <div className="text-sm text-gray-500">Todavía no hay un QR cargado.</div>
              )}

              <div className="flex flex-wrap gap-2">
                <label
                  className={`cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 ${
                    uploading ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {uploading ? "Subiendo..." : qrUrl ? "Reemplazar QR" : "Subir QR"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      uploadQr(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {qrUrl && (
                  <button
                    onClick={removeQr}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Aviso de stock bajo</h2>
              <p className="text-sm text-gray-600">
                Un producto aparece en <span className="font-medium">Stock bajo</span> (en el Inicio y
                marcado en Productos) cuando le quedan esta cantidad de unidades o menos. Si a un producto
                le cargás un mínimo propio, se usa ese.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mínimo general</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <button
                  onClick={saveThreshold}
                  disabled={savingThreshold}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600 disabled:opacity-50"
                >
                  {savingThreshold ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
