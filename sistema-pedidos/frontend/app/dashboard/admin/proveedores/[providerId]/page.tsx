"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type Product = { id: number; name: string; unit: string };

type InvoiceItem = {
  id: number;
  productId: number;
  quantity: number;
  unitCost: number;
  subtotal: number;
  product?: Product;
};

type Installment = {
  id: number;
  number: number;
  amount: number;
  dueDate: string;
  paid: boolean;
};

type Invoice = {
  id: number;
  number?: string | null;
  date: string;
  total: number;
  paymentType: "fiado" | "cuotas" | "completo";
  pending: number;
  items: InvoiceItem[];
  installments: Installment[];
};

type Movement = {
  id: number;
  type: string;
  description: string;
  amount: number;
  method?: string | null;
  createdAt: string;
  invoiceId?: number | null;
};

type ProviderDetail = {
  id: number;
  name: string;
  cuit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  debt: number;
  invoices: Invoice[];
  movements: Movement[];
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("es-AR") : "-";

type DraftItem = {
  productId: string;
  quantity: string;
  unitCost: string;
  salePrice: string;
  salePriceTouched: boolean;
};
type DraftInstallment = { amount: string; dueDate: string };

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params?.providerId as string;

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const [showEditForm, setShowEditForm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCuit, setEditCuit] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState("");
  const [invPaymentType, setInvPaymentType] = useState<"fiado" | "cuotas" | "completo">("completo");
  const [invItems, setInvItems] = useState<DraftItem[]>([
    { productId: "", quantity: "1", unitCost: "", salePrice: "", salePriceTouched: false },
  ]);
  const [margin, setMargin] = useState("20");
  const [installments, setInstallments] = useState<DraftInstallment[]>([{ amount: "", dueDate: "" }]);

  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);

  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payingInstallmentId, setPayingInstallmentId] = useState<number | null>(null);
  const [installmentMethod, setInstallmentMethod] = useState("efectivo");

  const PAYMENT_METHODS = ["efectivo", "transferencia", "tarjeta", "cheque", "cheque electrónico", "otro"];

  const load = async () => {
    setLoading(true);
    try {
      const [provRes, prodRes] = await Promise.all([
        apiFetch(`/api/providers/${providerId}`),
        apiFetch("/api/products/admin"),
      ]);
      const provData = await provRes.json().catch(() => null);
      const prodData = await prodRes.json().catch(() => []);

      if (!provRes.ok) {
        toast.error(provData?.error || "No se pudo cargar el proveedor");
        return;
      }

      setProvider(provData);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setEditName(provData.name ?? "");
      setEditCuit(provData.cuit ?? "");
      setEditPhone(provData.phone ?? "");
      setEditEmail(provData.email ?? "");
      setEditAddress(provData.address ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (providerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const invoiceTotal = invItems.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
    0
  );
  const installmentsTotal = installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const calcSuggested = (unitCost: string, marginPct: string) => {
    const cost = Number(unitCost);
    const pct = Number(marginPct);
    if (!cost || !pct) return "";
    return (cost * (1 + pct / 100)).toFixed(2);
  };

  const updateItemCost = (idx: number, unitCost: string) => {
    setInvItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        // si el usuario no tocó el precio de venta a mano, se lo seguimos sugiriendo
        const nextSalePrice = row.salePriceTouched ? row.salePrice : calcSuggested(unitCost, margin);
        return { ...row, unitCost, salePrice: nextSalePrice };
      })
    );
  };

  const updateItemSalePrice = (idx: number, salePrice: string) => {
    setInvItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, salePrice, salePriceTouched: true } : row))
    );
  };

  const applyMarginToAll = (nextMargin: string) => {
    setMargin(nextMargin);
    setInvItems((prev) =>
      prev.map((row) =>
        row.salePriceTouched ? row : { ...row, salePrice: calcSuggested(row.unitCost, nextMargin) }
      )
    );
  };

  const addItemRow = () =>
    setInvItems((prev) => [
      ...prev,
      { productId: "", quantity: "1", unitCost: "", salePrice: "", salePriceTouched: false },
    ]);
  const removeItemRow = (idx: number) =>
    setInvItems((prev) => prev.filter((_, i) => i !== idx));

  const addInstallmentRow = () => setInstallments((prev) => [...prev, { amount: "", dueDate: "" }]);
  const removeInstallmentRow = (idx: number) =>
    setInstallments((prev) => prev.filter((_, i) => i !== idx));

  const resetInvoiceForm = () => {
    setInvNumber("");
    setInvDate("");
    setInvPaymentType("completo");
    setMargin("20");
    setInvItems([{ productId: "", quantity: "1", unitCost: "", salePrice: "", salePriceTouched: false }]);
    setInstallments([{ amount: "", dueDate: "" }]);
  };

  const createInvoice = async () => {
    const items = invItems
      .filter((it) => it.productId && Number(it.quantity) > 0 && Number(it.unitCost) > 0)
      .map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
        ...(Number(it.salePrice) > 0 ? { salePrice: Number(it.salePrice) } : {}),
      }));

    if (!items.length) {
      toast.error("Agregá al menos un producto válido");
      return;
    }

    if (invPaymentType === "cuotas") {
      const validInstallments = installments.filter((i) => Number(i.amount) > 0 && i.dueDate);
      if (!validInstallments.length) {
        toast.error("Definí al menos una cuota con monto y fecha");
        return;
      }
      if (Math.abs(installmentsTotal - invoiceTotal) > 1) {
        toast.error("La suma de las cuotas no coincide con el total de la factura");
        return;
      }
    }

    setSavingInvoice(true);
    try {
      const res = await apiFetch(`/api/providers/${providerId}/invoices`, {
        method: "POST",
        body: JSON.stringify({
          number: invNumber || undefined,
          date: invDate || undefined,
          paymentType: invPaymentType,
          items,
          installments:
            invPaymentType === "cuotas"
              ? installments
                  .filter((i) => Number(i.amount) > 0 && i.dueDate)
                  .map((i) => ({ amount: Number(i.amount), dueDate: i.dueDate }))
              : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error creando la factura");
        return;
      }
      toast.success("Factura cargada. Stock y precio costo actualizados.");
      resetInvoiceForm();
      setShowInvoiceForm(false);
      load();
    } finally {
      setSavingInvoice(false);
    }
  };

  const payInstallment = async (installmentId: number, method: string) => {
    try {
      const res = await apiFetch(`/api/installments/${installmentId}/pay`, {
        method: "PATCH",
        body: JSON.stringify({ method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error registrando el pago");
        return;
      }
      toast.success("Cuota pagada");
      setPayingInstallmentId(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const registerInvoicePayment = async (invoiceId: number) => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, method: payMethod }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error registrando el pago");
        return;
      }
      toast.success("Pago registrado");
      setPayingInvoiceId(null);
      setPayAmount("");
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const addManualMovement = async () => {
    const amount = Number(adjustAmount);
    if (!adjustDesc.trim() || !amount) {
      toast.error("Completá descripción y monto (puede ser negativo)");
      return;
    }
    setSavingAdjust(true);
    try {
      const res = await apiFetch(`/api/providers/${providerId}/movements`, {
        method: "POST",
        body: JSON.stringify({ description: adjustDesc, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error registrando el ajuste");
        return;
      }
      toast.success("Ajuste registrado");
      setAdjustDesc("");
      setAdjustAmount("");
      setShowAdjustForm(false);
      load();
    } finally {
      setSavingAdjust(false);
    }
  };

  const saveProviderEdit = async () => {
    if (!editName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await apiFetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          cuit: editCuit || undefined,
          phone: editPhone || undefined,
          email: editEmail || undefined,
          address: editAddress || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error guardando los cambios");
        return;
      }
      toast.success("Proveedor actualizado");
      setShowEditForm(false);
      load();
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteProvider = async () => {
    const debtWarning =
      provider && provider.debt > 0
        ? `\n\n⚠️ Todavía le debés ${formatMoney(provider.debt)}. Esa deuda queda registrada igual, pero el proveedor no va a aparecer más en tu lista.`
        : "";
    const confirmed = window.confirm(
      `¿Eliminar a "${provider?.name}"? Sus facturas y movimientos quedan guardados, pero dejará de aparecer en la lista de proveedores.${debtWarning}`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await apiFetch(`/api/providers/${providerId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Error eliminando el proveedor");
        return;
      }
      toast.success("Proveedor eliminado");
      router.push("/dashboard/admin/proveedores");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Cargando...</div>;
  if (!provider) return <div className="p-6 text-gray-600">Proveedor no encontrado.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6 space-y-6">
      <button
        onClick={() => router.push("/dashboard/admin/proveedores")}
        className="text-sm text-amber-700 hover:underline"
      >
        ← Volver a proveedores
      </button>

      <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{provider.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {[provider.cuit, provider.phone, provider.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                provider.debt > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
            >
              Deuda: {formatMoney(provider.debt)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditForm((v) => !v)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showEditForm ? "Cancelar" : "Editar"}
              </button>
              <button
                onClick={deleteProvider}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>

        {showEditForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Nombre *"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="CUIT"
              value={editCuit}
              onChange={(e) => setEditCuit(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Teléfono"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              placeholder="Dirección"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 md:col-span-2"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={saveProviderEdit}
                disabled={savingEdit}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nueva factura */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Facturas</h2>
          <button
            onClick={() => setShowInvoiceForm((v) => !v)}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-600"
          >
            {showInvoiceForm ? "Cancelar" : "+ Nueva factura"}
          </button>
        </div>

        {showInvoiceForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="N° de factura (opcional)"
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <select
                value={invPaymentType}
                onChange={(e) => setInvPaymentType(e.target.value as "fiado" | "cuotas" | "completo")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="completo">Pago completo</option>
                <option value="fiado">Fiado (queda a deber)</option>
                <option value="cuotas">Cuotas</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-700">Productos</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>Margen sugerido</span>
                  <input
                    type="number"
                    min={0}
                    value={margin}
                    onChange={(e) => applyMarginToAll(e.target.value)}
                    className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                  />
                  <span>%</span>
                </div>
              </div>
              {invItems.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_110px_110px_auto] gap-2">
                  <select
                    value={it.productId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInvItems((prev) => prev.map((row, i) => (i === idx ? { ...row, productId: v } : row)));
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Seleccioná un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    placeholder="Cant."
                    value={it.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInvItems((prev) => prev.map((row, i) => (i === idx ? { ...row, quantity: v } : row)));
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Costo unit."
                    value={it.unitCost}
                    onChange={(e) => updateItemCost(idx, e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Precio venta"
                    value={it.salePrice}
                    onChange={(e) => updateItemSalePrice(idx, e.target.value)}
                    className="rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm text-gray-900"
                    title="Se sugiere solo con el margen, pero podés editarlo antes de guardar"
                  />
                  <button
                    onClick={() => removeItemRow(idx)}
                    disabled={invItems.length === 1}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button onClick={addItemRow} className="text-sm text-amber-700 hover:underline">
                + Agregar producto
              </button>
              <p className="text-xs text-gray-500">
                El precio de venta se sugiere solo (costo + margen), pero podés cambiarlo en
                cualquier fila antes de guardar. Si lo dejás vacío, el precio de venta actual
                del producto no se toca.
              </p>
              <p className="text-sm font-semibold text-gray-800">
                Total factura: {formatMoney(invoiceTotal)}
              </p>
            </div>

            {invPaymentType === "cuotas" && (
              <div className="space-y-2 border-t border-gray-200 pt-3">
                <p className="text-sm font-medium text-gray-700">Plan de cuotas</p>
                {installments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Monto"
                      value={inst.amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setInstallments((prev) => prev.map((row, i) => (i === idx ? { ...row, amount: v } : row)));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setInstallments((prev) => prev.map((row, i) => (i === idx ? { ...row, dueDate: v } : row)));
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                    <button
                      onClick={() => removeInstallmentRow(idx)}
                      disabled={installments.length === 1}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button onClick={addInstallmentRow} className="text-sm text-amber-700 hover:underline">
                  + Agregar cuota
                </button>
                <p
                  className={`text-sm font-semibold ${
                    Math.abs(installmentsTotal - invoiceTotal) > 1 ? "text-red-600" : "text-gray-800"
                  }`}
                >
                  Suma de cuotas: {formatMoney(installmentsTotal)} (debe coincidir con el total)
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={createInvoice}
                disabled={savingInvoice}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingInvoice ? "Guardando..." : "Guardar factura"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de facturas */}
        <div className="divide-y">
          {provider.invoices.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">Todavía no hay facturas cargadas.</div>
          ) : (
            provider.invoices.map((inv) => (
              <div key={inv.id} className="p-4 md:p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-gray-900">
                      Factura {inv.number ? `N° ${inv.number}` : `#${inv.id}`}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">{formatDate(inv.date)}</span>
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {inv.paymentType === "completo"
                        ? "Pago completo"
                        : inv.paymentType === "fiado"
                        ? "Fiado"
                        : "Cuotas"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total: {formatMoney(inv.total)}</div>
                    <div
                      className={`text-sm font-semibold ${
                        inv.pending > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {inv.pending > 0 ? `Pendiente: ${formatMoney(inv.pending)}` : "Pagada"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  {inv.items.map((it) => (
                    <div key={it.id}>
                      {it.quantity} × {it.product?.name ?? `Producto #${it.productId}`} — {formatMoney(it.unitCost)} c/u
                    </div>
                  ))}
                </div>

                {inv.paymentType === "cuotas" && inv.installments.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {inv.installments.map((inst) => (
                      <div key={inst.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-gray-600">
                          Cuota {inst.number} · vence {formatDate(inst.dueDate)} · {formatMoney(inst.amount)}
                        </span>
                        {inst.paid ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                            Pagada
                          </span>
                        ) : payingInstallmentId === inst.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={installmentMethod}
                              onChange={(e) => setInstallmentMethod(e.target.value)}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900"
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => payInstallment(inst.id, installmentMethod)}
                              className="rounded-lg bg-gray-900 px-2 py-1 text-white"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setPayingInstallmentId(null)}
                              className="text-gray-500 hover:underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPayingInstallmentId(inst.id)}
                            className="rounded-lg border border-amber-300 px-2 py-1 text-amber-700 hover:bg-amber-50"
                          >
                            Marcar pagada
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {inv.paymentType === "fiado" && inv.pending > 0 && (
                  <div className="pt-1">
                    {payingInvoiceId === inv.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          placeholder="Monto a pagar"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-40 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900"
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => registerInvoicePayment(inv.id)}
                          className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setPayingInvoiceId(null)}
                          className="text-sm text-gray-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayingInvoiceId(inv.id)}
                        className="rounded-lg border border-amber-300 px-3 py-1 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ajustes manuales + ledger */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Movimientos y ajustes</h2>
          <button
            onClick={() => setShowAdjustForm((v) => !v)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showAdjustForm ? "Cancelar" : "+ Ajuste manual"}
          </button>
        </div>

        {showAdjustForm && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-4 md:p-5 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-3">
              <input
                placeholder="Descripción (ej: nota de crédito, descuento)"
                value={adjustDesc}
                onChange={(e) => setAdjustDesc(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <input
                type="number"
                placeholder="Monto"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
              <button
                onClick={addManualMovement}
                disabled={savingAdjust}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {savingAdjust ? "Guardando..." : "Guardar"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Monto positivo suma deuda (ej: recargo), negativo la resta (ej: descuento o nota de crédito).
            </p>
          </div>
        )}

        <div className="divide-y">
          {provider.movements.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">Todavía no hay movimientos.</div>
          ) : (
            provider.movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <div className="text-gray-900">{m.description}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(m.createdAt)}
                    {m.method && ` · ${m.method}`}
                  </div>
                </div>
                <span className={`font-semibold ${m.amount > 0 ? "text-red-600" : "text-green-600"}`}>
                  {m.amount > 0 ? "+" : ""}
                  {formatMoney(m.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


