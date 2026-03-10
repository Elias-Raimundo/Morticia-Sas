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

export default function RegisterStep1Page() {
  const router = useRouter();

  const [form, setForm] = useState<Step1>({
    name: "",
    lastName: "",
    phone: "",
    address: "",
    dniCuil: "",
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setForm(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const onChange =
    (key: keyof Step1) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const next = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.lastName.trim() || !form.phone.trim() || !form.address.trim() || !form.dniCuil.trim()) {
      toast.warning("Completá todos los campos.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    router.push("/register/step2");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={next}
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
              <p className="mt-1 text-sm text-gray-600">Paso 1 de 2</p>

              <div className="mt-4 w-full">
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-amber-500 to-yellow-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Nombre"
                value={form.name}
                onChange={onChange("name")}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Apellido"
                value={form.lastName}
                onChange={onChange("lastName")}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Teléfono"
                value={form.phone}
                onChange={onChange("phone")}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Dirección"
                value={form.address}
                onChange={onChange("address")}
              />

              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="DNI/CUIL"
                value={form.dniCuil}
                onChange={onChange("dniCuil")}
              />
            </div>

            <button className="w-full rounded-xl bg-amber-500 px-4 py-3 text-gray-950 font-semibold hover:bg-amber-600 transition">
              Siguiente
            </button>
            <button 
              type="button"
              className= "w-full rounded-xl border border-gray-500 bg-white px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition"
              onClick={() => router.push("/")}> Volver</button>
              
            <p className="text-center text-sm text-gray-500">
              Completá tus datos personales para continuar con el registro.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}