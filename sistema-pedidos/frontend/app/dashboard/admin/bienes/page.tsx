"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Payment = {
  id: number;
  amount: number;
  method: string;
  date: string;
  notes?: string | null;
};

type Client = { id: number; name: string };

type Asset = {
  id: number;
  name: string;
  description?: string | null;
  location?: string | null;
  category?: string | null;
  installmentsCount?: number | null;
  clientId?: number | null;
  client?: Client | null;
  totalCost?: number | null;
  acquiredAt: string;
  payments: Payment[];
  paidTotal: number;
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

// Fecha con hora real (ej: cuándo se registró un pago): hora local.
const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR") : "-";

// Fecha "solo día" (adquisición): en UTC para que no se corra un día en Argentina.
const formatDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "-";

// "Local" del bien: el cliente donde está, o la ubicación escrita a mano.
const localOf = (a: { client?: { name: string } | null; location?: string | null }) =>
  a.client?.name ?? a.location ?? "Sin ubicación";

const METHODS = ["efectivo", "transferencia", "tarjeta", "cheque", "cheque electrónico", "cuotas", "otro"];

export default function BienesPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationOption, setLocationOption] = useState(""); // "" = sin elegir, "other" = otra, o el id del cliente
  const [customLocation, setCustomLocation] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [category, setCategory] = useState("");
  const [paidInInstallments, setPaidInInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [firstPaymentAmount, setFirstPaymentAmount] = useState("");
  const [firstPaymentMethod, setFirstPaymentMethod] = useState("efectivo");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [localFilter, setLocalFilter] = useState("");

  const [payingAssetId, setPayingAssetId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("efectivo");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    locationOption: "",
    customLocation: "",
    totalCost: "",
    category: "",
    installmentsCount: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [assetsRes, clientsRes] = await Promise.all([
        apiFetch("/api/assets"),
        apiFetch("/api/balance/admin/clients"),
      ]);
      const data = await assetsRes.json().catch(() => []);
      const clientsData = await clientsRes.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setLocationOption("");
    setCustomLocation("");
    setTotalCost("");
    setCategory("");
    setPaidInInstallments(false);
    setInstallmentsCount("");
    setAcquiredAt("");
    setFirstPaymentAmount("");
    setFirstPaymentMethod("efectivo");
  };

  const createAsset = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (paidInInstallments && !(Number(installmentsCount) >= 1)) {
      toast.error("Indicá la cantidad de cuotas");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/assets", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          clientId: locationOption && locationOption !== "other" ? Number(locationOption) : null,
          location: locationOption === "other" ? customLocation || undefined : undefined,
          totalCost: totalCost ? Number(totalCost) : undefined,
          category: category.trim() || undefined,
          installmentsCount: paidInInstallments ? Number(installmentsCount) : undefined,
          acquiredAt: acquiredAt || undefined,
          payments: firstPaymentAmount
            ? [{ amount: Number(firstPaymentAmount), method: firstPaymentMethod }]
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error registrando el bien");
        return;
      }
      toast.success("Bien registrado");
      resetForm();
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const addPayment = async (assetId: number) => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    try {
      const res = await apiFetch(`/api/assets/${assetId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, method: payMethod }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error registrando el pago");
        return;
      }
      toast.success("Pago registrado");
      setPayingAssetId(null);
      setPayAmount("");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (a: Asset) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      description: a.description ?? "",
      locationOption: a.clientId ? String(a.clientId) : a.location ? "other" : "",
      customLocation: a.clientId ? "" : a.location ?? "",
      totalCost: a.totalCost != null ? String(a.totalCost) : "",
      category: a.category ?? "",
      installmentsCount: a.installmentsCount ? String(a.installmentsCount) : "",
    });
  };

  const saveEdit = async (id: number) => {
    if (!editForm.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/assets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || undefined,
          clientId:
            editForm.locationOption && editForm.locationOption !== "other"
              ? Number(editForm.locationOption)
              : null,
          // null = borrar el dato (con undefined el valor viejo quedaba guardado)
          location:
            editForm.locationOption === "other" ? editForm.customLocation.trim() || null : null,
          totalCost: editForm.totalCost ? Number(editForm.totalCost) : undefined,
          category: editForm.category.trim() || null,
          installmentsCount: Number(editForm.installmentsCount) >= 1 ? Number(editForm.installmentsCount) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error guardando los cambios");
        return;
      }
      toast.success("Bien actualizado");
      setEditingId(null);
      load();
    } finally {
      setSavingEdit(false);
    }
  };

  const deactivateAsset = async (assetId: number) => {
    try {
      const res = await apiFetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Error eliminando el bien");
        return;
      }
      toast.success("Bien eliminado");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const categoryOptions = Array.from(
    new Set(items.map((a) => a.category?.trim()).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b));

  const localOptions = Array.from(new Set(items.map(localOf))).sort((a, b) => a.localeCompare(b));

  const query = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((a) => {
    if (categoryFilter && (a.category ?? "") !== categoryFilter) return false;
    if (localFilter && localOf(a) !== localFilter) return false;
    if (query) {
      const haystack = [a.name, a.description, a.category, localOf(a)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  const filtersActive = !!(query || categoryFilter || localFilter);

  const totalCapital = filteredItems.reduce((acc, a) => acc + (a.totalCost ?? 0), 0);

  const capitalPorUbicacion = filteredItems.reduce((acc, a) => {
    const key = localOf(a);
    acc[key] = (acc[key] ?? 0) + (a.totalCost ?? 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bienes de trabajo</h1>
            <p className="mt-1 text-sm text-gray-700">
              Herramientas, equipos, etc. — con su ubicación y cómo los fuiste pagando.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-semibold">
              {filtersActive ? "Capital del filtro" : "Capital total"}: {formatMoney(totalCapital)}
            </span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
            >
              {showForm ? "Cancelar" : "+ Nuevo bien"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
            />
            <input
              placeholder="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
            />
            <div>
              <select
                value={locationOption}
                onChange={(e) => setLocationOption(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Ubicación (elegí un cliente)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="other">Otra ubicación...</option>
              </select>
              {locationOption === "other" && (
                <input
                  placeholder="Escribí la ubicación"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              )}
            </div>
            <input
              type="number"
              placeholder="Costo total"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <div>
              <label className="text-xs text-gray-500">Fecha de adquisición</label>
              <input
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <input
                list="asset-categories"
                placeholder="Categoría (ej: Herramientas, Equipos)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <datalist id="asset-categories">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={paidInInstallments}
                  onChange={(e) => setPaidInInstallments(e.target.checked)}
                />
                Se pagó en cuotas
              </label>
              {paidInInstallments && (
                <input
                  type="number"
                  min={1}
                  placeholder="Cantidad de cuotas"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                />
              )}
            </div>
            <div className="md:col-span-2 border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500 mb-2">
                Opcional: registrá el primer pago que hiciste por este bien
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Monto pagado"
                  value={firstPaymentAmount}
                  onChange={(e) => setFirstPaymentAmount(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <select
                  value={firstPaymentMethod}
                  onChange={(e) => setFirstPaymentMethod(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={createAsset}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar bien"}
              </button>
            </div>
          </div>
        )}
      </div>

      {Object.keys(capitalPorUbicacion).length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b">
            <h2 className="font-semibold text-gray-900">Capital por ubicación</h2>
          </div>
          <div className="divide-y">
            {Object.entries(capitalPorUbicacion).map(([loc, total]) => (
              <div key={loc} className="flex items-center justify-between p-3 text-sm">
                <span className="text-gray-700">{loc}</span>
                <span className="font-semibold text-gray-900">{formatMoney(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex flex-wrap items-center gap-3 border-b bg-gray-50">
          <input
            type="search"
            placeholder="Buscar bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Todas las categorías</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Todos los locales</option>
            {localOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {filtersActive && (
            <>
              <span className="text-xs text-gray-500">
                {filteredItems.length} de {items.length}
              </span>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("");
                  setLocalFilter("");
                }}
                className="text-sm text-amber-700 hover:underline"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-600">Todavía no registraste ningún bien.</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-gray-600">No hay bienes que coincidan con los filtros.</div>
        ) : (
          <div className="divide-y">
            {filteredItems.map((a) => {
              const pending = (a.totalCost ?? 0) - a.paidTotal;

              if (editingId === a.id) {
                return (
                  <div key={a.id} className="p-4 md:p-5 bg-gray-50/60 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        placeholder="Nombre *"
                        value={editForm.name}
                        onChange={(ev) => setEditForm((f) => ({ ...f, name: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
                      />
                      <input
                        placeholder="Descripción"
                        value={editForm.description}
                        onChange={(ev) => setEditForm((f) => ({ ...f, description: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
                      />
                      <div>
                        <select
                          value={editForm.locationOption}
                          onChange={(ev) => setEditForm((f) => ({ ...f, locationOption: ev.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        >
                          <option value="">Ubicación (elegí un cliente)</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                          <option value="other">Otra ubicación...</option>
                        </select>
                        {editForm.locationOption === "other" && (
                          <input
                            placeholder="Escribí la ubicación"
                            value={editForm.customLocation}
                            onChange={(ev) => setEditForm((f) => ({ ...f, customLocation: ev.target.value }))}
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                          />
                        )}
                      </div>
                      <input
                        type="number"
                        placeholder="Costo total"
                        value={editForm.totalCost}
                        onChange={(ev) => setEditForm((f) => ({ ...f, totalCost: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                      <input
                        list="asset-categories"
                        placeholder="Categoría"
                        value={editForm.category}
                        onChange={(ev) => setEditForm((f) => ({ ...f, category: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Cantidad de cuotas (vacío = no en cuotas)"
                        value={editForm.installmentsCount}
                        onChange={(ev) =>
                          setEditForm((f) => ({ ...f, installmentsCount: ev.target.value }))
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEdit(a.id)}
                        disabled={savingEdit}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {savingEdit ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={a.id} className="p-4 md:p-5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{a.name}</span>
                        {a.category && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {a.category}
                          </span>
                        )}
                        {a.installmentsCount ? (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            📅 {a.installmentsCount} {a.installmentsCount === 1 ? "cuota" : "cuotas"}
                          </span>
                        ) : null}
                      </div>
                      {a.description && (
                        <div className="text-sm text-gray-500">{a.description}</div>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        {(a.client?.name || a.location) && `📍 ${a.client?.name ?? a.location} · `}
                        Adquirido: {formatDay(a.acquiredAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      {a.totalCost ? (
                        <>
                          <div className="text-sm text-gray-500">
                            Costo total: {formatMoney(a.totalCost)}
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              pending > 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {pending > 0 ? `Falta pagar: ${formatMoney(pending)}` : "Pagado completo"}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Pagado: {formatMoney(a.paidTotal)}</div>
                      )}
                    </div>
                  </div>

                  {a.payments.length > 0 && (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {a.payments.map((p) => (
                        <div key={p.id}>
                          {formatDate(p.date)} · {p.method} · {formatMoney(p.amount)}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {a.totalCost && pending <= 0 ? null : payingAssetId === a.id ? (
                      <>
                        <input
                          type="number"
                          placeholder="Monto"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        >
                          {METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => addPayment(a.id)}
                          className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setPayingAssetId(null)}
                          className="text-sm text-gray-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setPayingAssetId(a.id);
                          setPayMethod(a.installmentsCount ? "cuotas" : "efectivo");
                        }}
                        className="rounded-lg border border-amber-300 px-3 py-1 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        + Registrar pago
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(a)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deactivateAsset(a.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
