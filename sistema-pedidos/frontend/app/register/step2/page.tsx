"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {toast} from "sonner";

type Step1 = {
  name: string;
  lastName: string;
  phone: string;
  address: string;
  dniCuil: string;
};

const STORAGE_KEY = "register_step1";
const API_URL = process.env.NEXT_PUBLIC_API_URL ;

export default function RegisterStep2Page() {
  const router = useRouter();

  const [step1, setStep1] = useState<Step1 | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.push("/register/step1");
      return;
    }
    try {
      setStep1(JSON.parse(raw));
    } catch {
      router.push("/register/step1");
    }
  }, [router]);

  const back = () => router.push("/register/step1");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1) return;

    if (!email.trim()) return toast.warning("Ingresá un email.");
    if (!password) return toast.warning("Ingresá una contraseña.");
    if (password !== password2) return toast.error("Las contraseñas no coinciden.");
    if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
    if (!API_URL){
      toast.error("API_URL no configurada");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: step1.name,
          lastName: step1.lastName,
          phone: step1.phone,
          address: step1.address,
          dniCuil: step1.dniCuil,
          email,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.error || "Error registrando usuario");
        return;
      }

      localStorage.removeItem(STORAGE_KEY);
      toast.success("Usuario creado correctamente");
      router.push("/login");
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={submit}
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

              <h1 className="text-3xl font-bold text-gray-900">Crear cuenta</h1>
              <p className="mt-1 text-sm text-gray-600">Paso 2 de 2</p>

              <div className="mt-4 w-full">
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
                </div>
              </div>
            </div>

            {step1 && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-2">
                  Datos ingresados
                </div>
                <div>
                  {step1.name} {step1.lastName}
                </div>
                <div>{step1.phone}</div>
                <div>{step1.address}</div>
                <div>{step1.dniCuil}</div>
              </div>
            )}

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

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                type="password"
                placeholder="Repetir contraseña"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={back}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-60"
                disabled={loading}
              >
                Volver
              </button>


              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">
              Confirmá tu email y tu contraseña para finalizar el registro.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}