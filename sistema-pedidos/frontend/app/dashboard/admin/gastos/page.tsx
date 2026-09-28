"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type ExpenseInstallment = {
  id: number;
  number: number;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt?: string | null;
};

type Expense = {
  id: number;
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
  dueDate?: string | null;
  paid: boolean;
  paidAt?: string | null;
  reminderEnabled: boolean;
  isInstallment: boolean;
  installments: ExpenseInstallment[];
};

type ExpenseCategory = { id: number; name: string };

type Metrics = {
  year: number;
  totalYear: number;
  byMonth: { month: number; total: number; paid: number; pending: number }[];
  byCategory: { category: string; total: number; count: number }[];
};

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

// Fecha con hora real (ej: cuándo se marcó el pago): se muestra en hora local.
const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR") : "-";

// Fecha "solo día" (fecha del gasto, vencimientos): se muestra en UTC para que el
// día no se corra uno para atrás en Argentina (UTC-3).
const formatDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "-";

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paidFilter, setPaidFilter] = useState<"" | "true" | "false">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [showMetrics, setShowMetrics] = useState(false);
  const [metricsYear, setMetricsYear] = useState(new Date().getFullYear());
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [firstInstallmentDate, setFirstInstallmentDate] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [payingInstallmentId, setPayingInstallmentId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    category: "otro",
    amount: "",
    expenseDate: "",
    dueDate: "",
    reminderEnabled: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (paidFilter) params.set("paid", paidFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await apiFetch(`/api/expenses?${params.toString()}`);
      const data = await res.json().catch(() => ({ expenses: [], total: 0 }));
      setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await apiFetch("/api/expense-categories");
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      setCategory((prev) => prev || list[0]?.name || "");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, paidFilter, categoryFilter, search]);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await apiFetch(`/api/expenses/metrics?year=${metricsYear}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        toast.error(data?.error || "Error cargando las métricas");
        return;
      }
      setMetrics(data);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (showMetrics) loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMetrics, metricsYear, expenses]);

  // el buscador espera medio segundo desde que dejás de tipear para no
  // pegarle al servidor con cada letra
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const createCategory = async () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      toast.error("Escribí un nombre para la categoría");
      return;
    }
    setSavingCategory(true);
    try {
      const res = await apiFetch("/api/expense-categories", {
        method: "POST",
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error creando la categoría");
        return;
      }
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategory(data.name);
      setNewCategoryName("");
      setShowCategoryForm(false);
      toast.success("Categoría creada");
    } finally {
      setSavingCategory(false);
    }
  };

  const renameCategory = async (id: number) => {
    const cleanName = editingCategoryName.trim();
    if (!cleanName) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }
    const previous = categories.find((c) => c.id === id)?.name;
    try {
      const res = await apiFetch(`/api/expense-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error renombrando la categoría");
        return;
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      // mantener seleccionados los filtros/formularios que usaban el nombre viejo
      if (previous) {
        if (categoryFilter === previous) setCategoryFilter(data.name);
        if (category === previous) setCategory(data.name);
      }
      setEditingCategoryId(null);
      toast.success("Categoría actualizada");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCategory = async (id: number) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat || !window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    try {
      const res = await apiFetch(`/api/expense-categories/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error eliminando la categoría");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (categoryFilter === cat.name) setCategoryFilter("");
      if (category === cat.name) setCategory("");
      toast.success("Categoría eliminada");
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setDescription("");
    setCategory(categories[0]?.name || "");
    setAmount("");
    setExpenseDate("");
    setDueDate("");
    setReminderEnabled(false);
    setIsInstallment(false);
    setInstallmentsCount("");
    setFirstInstallmentDate("");
  };

  // Genera N cuotas mensuales a partir del monto total, dividido en partes
  // iguales (la última cuota se ajusta por si el reparto no es exacto).
  const buildInstallments = (totalAmount: number, count: number, firstDate: string) => {
    const base = Math.floor((totalAmount / count) * 100) / 100;
    const installments = [];
    const [y, m, d] = firstDate.split("-").map(Number);
    for (let i = 0; i < count; i++) {
      const due = new Date(y, m - 1 + i, d);
      const isLast = i === count - 1;
      const amountSoFar = base * i;
      installments.push({
        amount: isLast ? Math.round((totalAmount - amountSoFar) * 100) / 100 : base,
        dueDate: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(
          due.getDate()
        ).padStart(2, "0")}`,
      });
    }
    return installments;
  };

  const createExpense = async () => {
    if (!description.trim() || !Number(amount)) {
      toast.error("Completá descripción y monto");
      return;
    }
    if (isInstallment && (!Number(installmentsCount) || !firstInstallmentDate)) {
      toast.error("Completá la cantidad de cuotas y la fecha de la primera");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        description,
        category,
        amount: Number(amount),
        expenseDate: expenseDate || undefined,
        reminderEnabled,
      };
      if (isInstallment) {
        body.isInstallment = true;
        body.installments = buildInstallments(
          Number(amount),
          Number(installmentsCount),
          firstInstallmentDate
        );
      } else {
        body.dueDate = dueDate || undefined;
      }

      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error creando el gasto");
        return;
      }
      toast.success("Gasto registrado");
      resetForm();
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e: Expense) => {
    setEditingId(e.id);
    setEditForm({
      description: e.description,
      category: e.category,
      amount: String(e.amount),
      expenseDate: e.expenseDate ? e.expenseDate.slice(0, 10) : "",
      dueDate: e.dueDate ? e.dueDate.slice(0, 10) : "",
      reminderEnabled: e.reminderEnabled,
    });
  };

  const saveEdit = async (id: number) => {
    if (!editForm.description.trim() || !Number(editForm.amount)) {
      toast.error("Completá descripción y monto");
      return;
    }
    const isInstallmentExpense = !!expenses.find((x) => x.id === id)?.isInstallment;
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: editForm.description,
          category: editForm.category,
          amount: Number(editForm.amount),
          expenseDate: editForm.expenseDate || undefined,
          dueDate: isInstallmentExpense ? undefined : editForm.dueDate || undefined,
          reminderEnabled: editForm.reminderEnabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error guardando los cambios");
        return;
      }
      toast.success("Gasto actualizado");
      setEditingId(null);
      load();
    } finally {
      setSavingEdit(false);
    }
  };

  const markAsPaid = async (id: number) => {
    try {
      const res = await apiFetch(`/api/expenses/${id}/pay`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error marcando el pago");
        return;
      }
      toast.success("Marcado como pagado");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const payInstallment = async (installmentId: number) => {
    setPayingInstallmentId(installmentId);
    try {
      const res = await apiFetch(`/api/expenses/installments/${installmentId}/pay`, {
        method: "PATCH",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error marcando la cuota como pagada");
        return;
      }
      toast.success("Cuota pagada");
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setPayingInstallmentId(null);
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const res = await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Error eliminando el gasto");
        return;
      }
      toast.success("Gasto eliminado");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gastos</h1>
            <p className="mt-1 text-sm text-gray-700">
              IVA, honorarios y gastos generales. Los que tienen aviso activo notifican
              1 día antes y el día del vencimiento si siguen sin pagarse.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-semibold">
              Total del filtro: {formatMoney(total)}
            </span>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
            >
              {showForm ? "Cancelar" : "+ Nuevo gasto"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Descripción *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
            />
            <div>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  {categories.length === 0 && <option value="">Sin categorías todavía</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm((v) => !v)}
                  className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  + nueva
                </button>
              </div>
              {showCategoryForm && (
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Nombre de la categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={createCategory}
                    disabled={savingCategory}
                    className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {savingCategory ? "..." : "Guardar"}
                  </button>
                </div>
              )}
            </div>
            <input
              type="number"
              placeholder={isInstallment ? "Monto total *" : "Monto *"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <div>
              <label className="text-xs text-gray-500">Fecha del gasto</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
              />
              Pago en cuotas (préstamo, plan de pago, etc.)
            </label>

            {isInstallment ? (
              <>
                <div>
                  <label className="text-xs text-gray-500">Cantidad de cuotas *</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ej: 12"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fecha de la primera cuota *</label>
                  <input
                    type="date"
                    value={firstInstallmentDate}
                    onChange={(e) => setFirstInstallmentDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                {Number(amount) > 0 && Number(installmentsCount) > 0 && (
                  <p className="text-xs text-gray-500 md:col-span-2">
                    Se van a crear {Number(installmentsCount)} cuotas de aprox.{" "}
                    {formatMoney(Number(amount) / Number(installmentsCount))} cada una, una por
                    mes a partir de la fecha elegida.
                  </p>
                )}
              </>
            ) : (
              <div>
                <label className="text-xs text-gray-500">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
              />
              {isInstallment
                ? "Avisarme (campanita) 1 día antes y el día que vence cada cuota sin pagar"
                : "Avisarme (campanita) 1 día antes y el día que vence si no lo pagué"}
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={createExpense}
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar gasto"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Métricas</h2>
            <p className="text-xs text-gray-500">
              Gastos por mes y por categoría. Los gastos en cuotas cuentan cada cuota en el mes
              de su vencimiento.
            </p>
          </div>
          <button
            onClick={() => setShowMetrics((v) => !v)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showMetrics ? "Ocultar métricas" : "Ver métricas"}
          </button>
        </div>

        {showMetrics && (
          <div className="border-t border-gray-100 p-4 md:p-5 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={metricsYear}
                onChange={(e) => setMetricsYear(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-semibold">
                Total {metricsYear}: {formatMoney(metrics?.totalYear ?? 0)}
              </span>
              {loadingMetrics && <span className="text-xs text-gray-500">Actualizando...</span>}
            </div>

            {metrics && metrics.totalYear === 0 ? (
              <p className="text-sm text-gray-500">No hay gastos cargados en {metricsYear}.</p>
            ) : (
              metrics && (
                <>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">Por mes</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.byMonth.map((m) => ({
                            ...m,
                            name: MONTH_LABELS[m.month - 1],
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            width={70}
                            tickFormatter={(v: number) => formatMoney(v)}
                          />
                          <Tooltip formatter={(v) => formatMoney(Number(v))} />
                          <Legend />
                          <Bar dataKey="paid" name="Pagado" stackId="a" fill="#10b981" />
                          <Bar dataKey="pending" name="Pendiente" stackId="a" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">Por categoría</h3>
                    <ul className="space-y-3">
                      {metrics.byCategory.map((c) => {
                        const pct = metrics.totalYear ? (c.total / metrics.totalYear) * 100 : 0;
                        return (
                          <li key={c.category}>
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <span className="font-medium text-gray-900">{c.category}</span>
                              <span className="text-gray-700">
                                {formatMoney(c.total)}{" "}
                                <span className="text-xs text-gray-500">
                                  · {pct.toFixed(1)}% · {c.count} {c.count === 1 ? "gasto" : "gastos"}
                                </span>
                              </span>
                            </div>
                            <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-amber-500"
                                style={{ width: `${Math.max(pct, 1)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex flex-wrap items-center gap-3 border-b bg-gray-50">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <span className="text-sm text-gray-500">a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <select
            value={paidFilter}
            onChange={(e) => setPaidFilter(e.target.value as "" | "true" | "false")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Todos</option>
            <option value="false">Pendientes</option>
            <option value="true">Pagados</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Buscar gasto..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-[180px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <button
            type="button"
            onClick={() => setShowManageCategories((v) => !v)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {showManageCategories ? "Cerrar categorías" : "Gestionar categorías"}
          </button>
        </div>

        {showManageCategories && (
          <div className="border-b bg-white p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Categorías de gastos</h2>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no hay categorías. Creá una desde "+ Nuevo gasto".
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-gray-200">
                {categories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    {editingCategoryId === c.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameCategory(c.id);
                            if (e.key === "Escape") setEditingCategoryId(null);
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                        />
                        <button
                          onClick={() => renameCategory(c.id)}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-900">{c.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategoryId(c.id);
                              setEditingCategoryName(c.name);
                            }}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteCategory(c.id)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Al renombrar una categoría se actualizan también los gastos que la usan. Una
              categoría con gastos no se puede eliminar hasta cambiarles la categoría.
            </p>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : expenses.length === 0 ? (
          <div className="p-6 text-gray-600">No hay gastos que coincidan.</div>
        ) : (
          <div className="divide-y">
            {expenses.map((e) => {
              const overdue = !e.paid && e.dueDate && new Date(e.dueDate) < new Date(new Date().toDateString());

              if (editingId === e.id) {
                // Gasto en cuotas: al cambiar el monto se recalculan las cuotas pendientes
                const editInstallments = e.installments || [];
                const paidInstallments = editInstallments.filter((i) => i.paid);
                const pendingInstallments = editInstallments.filter((i) => !i.paid);
                const paidTotal = paidInstallments.reduce((acc, i) => acc + i.amount, 0);
                const newAmount = Number(editForm.amount);
                const remainingToPay = newAmount - paidTotal;
                const amountChanged = e.isInstallment && Math.abs(newAmount - e.amount) > 0.004;
                const installmentEditError = !amountChanged
                  ? null
                  : pendingInstallments.length === 0
                  ? "Todas las cuotas ya están pagas: no se puede cambiar el monto."
                  : remainingToPay <= 0
                  ? `El monto total tiene que ser mayor a lo que ya pagaste (${formatMoney(paidTotal)}).`
                  : null;

                return (
                  <div key={e.id} className="p-4 bg-gray-50/60 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        placeholder="Descripción"
                        value={editForm.description}
                        onChange={(ev) => setEditForm((f) => ({ ...f, description: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
                      />
                      <select
                        value={editForm.category}
                        onChange={(ev) => setEditForm((f) => ({ ...f, category: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder={e.isInstallment ? "Monto total" : "Monto"}
                        value={editForm.amount}
                        onChange={(ev) => setEditForm((f) => ({ ...f, amount: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                      {e.isInstallment && (
                        <div className="md:col-span-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 space-y-1">
                          <div>
                            Ya pagaste {formatMoney(paidTotal)} en {paidInstallments.length}{" "}
                            {paidInstallments.length === 1 ? "cuota" : "cuotas"}.{" "}
                            {pendingInstallments.length === 1
                              ? "Queda 1 cuota pendiente."
                              : `Quedan ${pendingInstallments.length} cuotas pendientes.`}
                          </div>
                          {installmentEditError ? (
                            <div className="font-semibold text-red-700">{installmentEditError}</div>
                          ) : amountChanged ? (
                            <div className="font-semibold">
                              Al guardar, {pendingInstallments.length === 1 ? "la cuota pendiente pasa" : "las cuotas pendientes pasan"} a sumar{" "}
                              {formatMoney(remainingToPay)} (aprox.{" "}
                              {formatMoney(remainingToPay / pendingInstallments.length)} cada una). Las cuotas ya pagadas no se tocan.
                            </div>
                          ) : (
                            <div>
                              Si cambiás el monto total, se recalculan las cuotas pendientes. Las ya pagadas no se tocan.
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500">Fecha del gasto</label>
                        <input
                          type="date"
                          value={editForm.expenseDate}
                          onChange={(ev) => setEditForm((f) => ({ ...f, expenseDate: ev.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                      </div>
                      {!e.isInstallment && (
                        <div>
                          <label className="text-xs text-gray-500">Fecha de vencimiento</label>
                          <input
                            type="date"
                            value={editForm.dueDate}
                            onChange={(ev) => setEditForm((f) => ({ ...f, dueDate: ev.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.reminderEnabled}
                          onChange={(ev) => setEditForm((f) => ({ ...f, reminderEnabled: ev.target.checked }))}
                        />
                        {e.isInstallment
                          ? "Avisarme (campanita) 1 día antes y el día que vence cada cuota sin pagar"
                          : "Avisarme (campanita) 1 día antes y el día que vence si no lo pagué"}
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEdit(e.id)}
                        disabled={savingEdit || !!installmentEditError}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {savingEdit ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                );
              }

              const installments = e.installments || [];
              const paidCount = installments.filter((i) => i.paid).length;
              const nextInstallment = installments.find((i) => !i.paid);
              const isExpanded = expandedId === e.id;

              return (
                <div key={e.id}>
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{e.description}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {e.category}
                        </span>
                        {e.isInstallment && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            📅 {paidCount}/{installments.length} cuotas
                          </span>
                        )}
                        {e.reminderEnabled && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            🔔 con aviso
                          </span>
                        )}
                        {overdue && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Vencido
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Gasto: {formatDay(e.expenseDate)}
                        {e.isInstallment
                          ? nextInstallment &&
                            ` · Próxima cuota (${nextInstallment.number}): ${formatDay(
                              nextInstallment.dueDate
                            )}`
                          : e.dueDate && ` · Vence: ${formatDay(e.dueDate)}`}
                        {e.paid && e.paidAt && ` · Pagado: ${formatDate(e.paidAt)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{formatMoney(e.amount)}</span>
                      {e.isInstallment ? (
                        e.paid ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            Pagado
                          </span>
                        ) : (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : e.id)}
                            className="rounded-lg border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            {isExpanded ? "Ocultar cuotas" : "Ver cuotas"}
                          </button>
                        )
                      ) : e.paid ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                          Pagado
                        </span>
                      ) : (
                        <button
                          onClick={() => markAsPaid(e.id)}
                          className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Marcar pagado
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(e)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {e.isInstallment && isExpanded && (
                    <div className="bg-indigo-50/50 px-4 pb-4">
                      <div className="rounded-lg border border-indigo-100 bg-white divide-y">
                        {installments.map((i) => (
                          <div
                            key={i.id}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-gray-800">Cuota {i.number}</span>
                              <span className="ml-2 text-gray-500">
                                Vence: {formatDay(i.dueDate)}
                              </span>
                              {i.paid && i.paidAt && (
                                <span className="ml-2 text-gray-400">
                                  · Pagada: {formatDate(i.paidAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {formatMoney(i.amount)}
                              </span>
                              {i.paid ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                                  Pagada
                                </span>
                              ) : (
                                <button
                                  onClick={() => payInstallment(i.id)}
                                  disabled={payingInstallmentId === i.id}
                                  className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {payingInstallmentId === i.id ? "..." : "Marcar pagada"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

