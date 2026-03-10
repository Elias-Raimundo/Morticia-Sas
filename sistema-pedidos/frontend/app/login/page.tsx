"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return toast.warning("Ingresá un email.");
    if (!password) return toast.warning("Ingresá una contraseña.");
    
    setLoading(true);

    try{
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Error");
      return;
    }

    if (!data?.token) {
      toast.error("No llegó token del backend");
      return;
    }

    localStorage.setItem("token", data.token);

    // ✅ redirección
    window.location.href = "/dashboard"; // (más “bruto”, pero infalible)
    // o router.push("/dashboard");
  }catch (error) {
    console.error("Error en login:", error);
    toast.error("Error de red o inesperado");
  }finally{
    setLoading(false);
  }
};

return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleLogin}
          className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl"
        >
          <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

          <div className="p-8 space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center text-center">
              <img
                src="/logo2.jpeg"
                alt="Morticia"
                className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shadow-sm mb-4"
              />

              <h1 className="text-3xl font-bold text-gray-900">
                Iniciar sesión
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Accedé a tu cuenta para gestionar tus pedidos
              </p>
            </div>

            {/* Inputs */}
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
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Botón */}
            <button
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

             <button 
             type="button"
             className= "w-full rounded-xl border border-gray-500 bg-white px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
            onClick={() => router.push("/")}> Volver</button>

            {/* Link registro */}
            <p className="text-center text-sm text-gray-500">
              ¿No tenés cuenta?{" "}
              <span
                className="text-amber-600 font-medium cursor-pointer hover:underline"
                onClick={() => router.push("/register/step1")}
              >
                Crear cuenta
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}