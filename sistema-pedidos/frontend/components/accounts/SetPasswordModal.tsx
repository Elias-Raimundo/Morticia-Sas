"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import PasswordInput from "@/components/ui/PasswordInput";

type Props = {
  account: { id: number; name: string } | null;
  onClose: () => void;
};

// El admin le asigna una contraseña nueva a una cuenta (cliente o administrador).
export default function SetPasswordModal({ account, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);

  if (!account) return null;

  const reset = () => {
    setPassword("");
    setRepeat("");
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.warning("La contraseña debe tener al menos 6 caracteres.");
    if (password !== repeat) return toast.warning("Las contraseñas no coinciden.");

    setSaving(true);
    try {
      const res = await apiFetch(`/api/accounts/${account.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo cambiar la contraseña");
        return;
      }
      toast.success(`Contraseña de ${account.name} actualizada. Pasásela por un medio seguro: después la puede cambiar desde "Cambiar contraseña".`);
      reset();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error de red o inesperado");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={close} />

      <form
        onSubmit={submit}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
            <p className="mt-1 text-sm text-gray-600">
              Nueva contraseña para <span className="font-semibold">{account.name}</span>.
            </p>
          </div>

          <PasswordInput
            className={inputClass}
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <PasswordInput
            className={inputClass}
            placeholder="Repetir nueva contraseña"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={close}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
