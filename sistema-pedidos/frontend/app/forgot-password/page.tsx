"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return toast.warning("Ingresá tu email.");
    if (!newPassword) return toast.warning("Ingresá la nueva contraseña.");
    if (newPassword.length < 6) {
      return toast.warning("La contraseña debe tener al menos 6 caracteres.");
    }
    if (newPassword !== repeatPassword) {
      return toast.warning("Las contraseñas no coinciden.");
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/reset-password-simple", {
        method: "POST",
        body: JSON.stringify({
          email,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Error actualizando contraseña");
        return;
      }

      toast.success("Contraseña actualizada correctamente");
      router.push("/login");
    } catch (error) {
      console.error(error);
      toast.error("Error de red o inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleReset}
          className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl"
        >
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center">
              <img
                src="/logo2.jpeg"
                alt="Morticia"
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shadow-sm mb-4"
              />

              <h1 className="text-3xl font-bold text-gray-900">
                Recuperar contraseña
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Ingresá tu email y una nueva contraseña
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                type="password"
                placeholder="Repetir nueva contraseña"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>

            <button
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-gray-500 bg-white px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
              onClick={() => router.push("/login")}
            >
              Volver al login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}