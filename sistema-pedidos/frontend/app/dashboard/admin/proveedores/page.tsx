"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Provider = {
  id: number;
  name: string;
  cuit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  debt: number;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export default function ProveedoresPage() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [cuit, setCuit] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/providers");
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setCuit("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const createProvider = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          name,
          cuit: cuit || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error creando proveedor");
        return;
      }
      toast.success("Proveedor creado");
      resetForm();
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const totalDeuda = items.reduce((acc, p) => acc + p.debt, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Proveedores</h1>
            <p className="mt-1 text-sm text-gray-700">
              Registrá tus proveedores y llevá el detalle de lo que les debés.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-3 py-1 text-sm font-semibold">
              Deuda total: {formatMoney(totalDeuda)}
            </span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
            >
              {showForm ? "Cancelar" : "+ Nuevo proveedor"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="CUIT"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={createProvider}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar proveedor"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-600">Todavía no cargaste ningún proveedor.</div>
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/admin/proveedores/${p.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-amber-50 transition"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[p.cuit, p.phone, p.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                    p.debt > 0
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {p.debt > 0 ? formatMoney(p.debt) : "Sin deuda"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
