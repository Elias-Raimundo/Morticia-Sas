"use client";

import { useRouter } from "next/navigation";

// La contraseña ya no se puede cambiar desde acá: la asigna un administrador desde el
// panel (Administración → "Contraseña"). El cambio público anterior dejaba modificar la
// clave de cualquier cuenta sabiendo solo el email.
export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center">
              <img
                src="/logo2.jpeg"
                alt="Morticia"
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shadow-sm mb-4"
              />

              <h1 className="text-3xl font-bold text-gray-900">
                ¿Olvidaste tu contraseña?
              </h1>

              <p className="mt-3 text-sm text-gray-600">
                Comunicate con la administración y te van a asignar una contraseña nueva.
                Después podés entrar normalmente con tu email.
              </p>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition"
              onClick={() => router.push("/login")}
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
