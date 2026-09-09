"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

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
};

type ExpenseCategory = { id: number; name: string };

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR") : "-";

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paidFilter, setPaidFilter] = useState<"" | "true" | "false">("");

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
  }, [dateFrom, dateTo, paidFilter]);

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

  const resetForm = () => {
    setDescription("");
    setCategory(categories[0]?.name || "");
    setAmount("");
    setExpenseDate("");
    setDueDate("");
    setReminderEnabled(false);
  };

  const createExpense = async () => {
    if (!description.trim() || !Number(amount)) {
      toast.error("Completá descripción y monto");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          description,
          category,
          amount: Number(amount),
          expenseDate: expenseDate || undefined,
          dueDate: dueDate || undefined,
          reminderEnabled,
        }),
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
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          description: editForm.description,
          category: editForm.category,
          amount: Number(editForm.amount),
          expenseDate: editForm.expenseDate || undefined,
          dueDate: editForm.dueDate || undefined,
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
              placeholder="Monto *"
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
            <div>
              <label className="text-xs text-gray-500">Fecha de vencimiento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
              />
              Avisarme (campanita) 1 día antes y el día que vence si no lo pagué
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
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Cargando...</div>
        ) : expenses.length === 0 ? (
          <div className="p-6 text-gray-600">No hay gastos que coincidan.</div>
        ) : (
          <div className="divide-y">
            {expenses.map((e) => {
              const overdue = !e.paid && e.dueDate && new Date(e.dueDate) < new Date(new Date().toDateString());

              if (editingId === e.id) {
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
                        placeholder="Monto"
                        value={editForm.amount}
                        onChange={(ev) => setEditForm((f) => ({ ...f, amount: ev.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                      <div>
                        <label className="text-xs text-gray-500">Fecha del gasto</label>
                        <input
                          type="date"
                          value={editForm.expenseDate}
                          onChange={(ev) => setEditForm((f) => ({ ...f, expenseDate: ev.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Fecha de vencimiento</label>
                        <input
                          type="date"
                          value={editForm.dueDate}
                          onChange={(ev) => setEditForm((f) => ({ ...f, dueDate: ev.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.reminderEnabled}
                          onChange={(ev) => setEditForm((f) => ({ ...f, reminderEnabled: ev.target.checked }))}
                        />
                        Avisarme (campanita) 1 día antes y el día que vence si no lo pagué
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
                <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{e.description}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {e.category}
                      </span>
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
                      Gasto: {formatDate(e.expenseDate)}
                      {e.dueDate && ` · Vence: ${formatDate(e.dueDate)}`}
                      {e.paid && e.paidAt && ` · Pagado: ${formatDate(e.paidAt)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatMoney(e.amount)}</span>
                    {e.paid ? (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

