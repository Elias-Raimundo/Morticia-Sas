"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

        <div className="grid md:grid-cols-2">
          <div className="p-10 flex flex-col justify-center">
            <img
              src="/logo2.jpeg"
              alt="Morticia"
              className="w-24 h-24 rounded-2xl object-cover border border-gray-200 shadow-sm mb-6"
            />

            <h1 className="text-4xl font-bold text-gray-900">
              Morticia-SAS
            </h1>

            <p className="mt-3 text-gray-600 text-lg">
              Sistema de pedidos para gestionar productos, órdenes, saldos y clientes.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Ingresá con tu cuenta o registrate para comenzar.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/login")}
                className="rounded-xl bg-amber-500 px-5 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition"
              >
                Iniciar sesión
              </button>

              <button
                onClick={() => router.push("/register/step1")}
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Crear cuenta
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-10">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white backdrop-blur-sm">
              <h2 className="text-2xl font-semibold mb-4">
                Qué podés hacer
              </h2>

              <div className="space-y-3 text-sm text-gray-200">
                <p>• Crear y enviar pedidos fácilmente</p>
                <p>• Ver historial y descargar PDF</p>
                <p>• Consultar saldos y pagos</p>
              </div>
            </div>
          </div>

          <footer className="text-xs text-gray-400 text-center py-4">
            © {new Date().getFullYear()} Morticia — Sistema desarrollado por Elias Raimundo
          </footer>
        </div>
      </div>
    </main>
  );
}