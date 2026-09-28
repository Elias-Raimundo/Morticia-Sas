"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ClientBalanceModal from "@/components/balance/ClientBalanceModal";
import { toast } from "sonner";
import { useAuth } from "@/context/Auth.context";

type ClientBalance = {
  id: number;
  name: string;
  email: string | null;
  hasAccess?: boolean;
  contactEmail?: string | null;
  balance: number;
};

// Los clientes de venta al público no tienen login: se muestra su mail de contacto, si lo hay.
const contactLabel = (c: ClientBalance) =>
  c.hasAccess === false
    ? `Sin acceso al sistema${c.contactEmail ? ` · ${c.contactEmail}` : ""}`
    : c.email ?? "";

type AdminUser = {
  id: number;
  name: string;
  lastName?: string | null;
  email: string;
  receiveOrderEmails: boolean;
};

export default function AdminPage() {
  const { user: me } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [savingAdminId, setSavingAdminId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [items, setItems] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/balance/admin/clients");
      const data = await res.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await apiFetch("/api/admins");
      const data = await res.json().catch(() => []);
      setAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleOrderEmails = async (admin: AdminUser) => {
    setSavingAdminId(admin.id);
    try {
      const res = await apiFetch(`/api/admins/${admin.id}/order-emails`, {
        method: "PATCH",
        body: JSON.stringify({ receive: !admin.receiveOrderEmails }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo guardar el cambio");
        return;
      }
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, ...data } : a)));
      toast.success(
        data.receiveOrderEmails
          ? "Ahora recibe el mail de cada pedido"
          : "Ya no recibe el mail de los pedidos"
      );
    } finally {
      setSavingAdminId(null);
    }
  };

  // Elimina la cuenta; si tiene historial el servidor la archiva en lugar de borrarla
  const deleteAccount = async (id: number, name: string, balance?: number) => {
    const saldo = balance ? `\n\nOjo: tiene un saldo de ${formatMoney(balance)}.` : "";
    const ok = window.confirm(
      `¿Eliminar la cuenta de "${name}"?\n\n` +
        "Si no tiene historial se borra. Si ya tiene pedidos o movimientos se archiva: " +
        "deja de poder entrar y se conserva su historial." +
        saldo
    );
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo eliminar la cuenta");
        return;
      }
      toast.success(data?.message || "Cuenta eliminada");
      load();
      loadAdmins();
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    load();
    loadAdmins();
  }, []);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Administración</h1>
          <p className="mt-1 text-sm text-gray-700">
            Balance actual de cada cliente.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <input
            type="text"
            placeholder="Buscar cliente por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-600">No hay clientes.</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-gray-600">No hay clientes que coincidan con la búsqueda.</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y md:hidden">
              {filteredItems.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div>
                    <div className="font-semibold text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500 break-all">
                      {contactLabel(item)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Balance</span>
                      <span
                        className={`font-semibold ${
                          item.balance > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {formatMoney(item.balance)}
                      </span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-amber-300 text-amber-700 px-3 py-2 text-sm hover:bg-amber-50"
                      onClick={() => {
                        setSelectedClientId(item.id);
                        setDetailsOpen(true);
                      }}
                    >
                      Ver detalles
                    </button>
                    <button
                      className="rounded-lg border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50"
                      disabled={deletingId === item.id}
                      onClick={() => deleteAccount(item.id, item.name, item.balance)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b font-semibold text-sm bg-amber-50 text-gray-800">
                  <div className="col-span-3">Cliente</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2 text-right">Balance</div>
                  <div className="col-span-4 text-right">Acción</div>
                </div>

                {filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b text-sm items-center ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    }`}
                  >
                    <div className="col-span-3 font-medium text-gray-900">
                      {item.name}
                    </div>

                    <div
                      className={`col-span-3 truncate ${
                        item.hasAccess === false ? "text-gray-500 italic" : "text-gray-700"
                      }`}
                    >
                      {contactLabel(item)}
                    </div>

                    <div
                      className={`col-span-2 text-right font-semibold ${
                        item.balance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatMoney(item.balance)}
                    </div>

                    <div className="col-span-4 flex justify-end gap-2">
                      <button
                        className="rounded-lg border border-amber-300 text-amber-700 px-3 py-1 text-sm hover:bg-amber-50"
                        onClick={() => {
                          setSelectedClientId(item.id);
                          setDetailsOpen(true);
                        }}
                      >
                        Ver detalles
                      </button>
                      <button
                        className="rounded-lg border border-red-200 text-red-600 px-3 py-1 text-sm hover:bg-red-50 disabled:opacity-50"
                        disabled={deletingId === item.id}
                        onClick={() => deleteAccount(item.id, item.name, item.balance)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Administradores</h2>
          <p className="text-xs text-gray-500">
            Elegí quién recibe por mail el PDF de cada pedido nuevo. Todos los administradores
            siguen viendo el aviso en la campanita.
          </p>
        </div>
        {admins.length === 0 ? (
          <div className="p-5 text-sm text-gray-600">No hay administradores.</div>
        ) : (
          <ul className="divide-y">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">
                    {a.name} {a.lastName ?? ""}
                  </div>
                  <div className="text-sm text-gray-500 break-all">{a.email}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Recibe mail de pedidos</span>
                    <input
                      type="checkbox"
                      checked={a.receiveOrderEmails}
                      disabled={savingAdminId === a.id}
                      onChange={() => toggleOrderEmails(a)}
                      className="h-4 w-4"
                    />
                  </label>
                  {String(a.id) !== String(me?.id) && (
                    <button
                      className="rounded-lg border border-red-200 text-red-600 px-3 py-1 text-sm hover:bg-red-50 disabled:opacity-50"
                      disabled={deletingId === a.id}
                      onClick={() => deleteAccount(a.id, `${a.name} ${a.lastName ?? ""}`.trim())}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClientBalanceModal
        open={detailsOpen}
        userId={selectedClientId}
        onClose={() => setDetailsOpen(false)}
        onChanged={load}
      />
    </div>
  );
}