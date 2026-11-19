"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  PackageX,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/Skeleton";

type HomeData = {
  today: string;
  sales: { monthTotal: number; monthCount: number; prevMonthTotal: number; todayTotal: number; todayCount: number };
  pending: {
    count: number;
    orders: { id: number; client: string; total: number; deliveryDate: string | null; confirmedAt: string }[];
  };
  deliveriesToday: { id: number; client: string; total: number }[];
  stock: {
    threshold: number;
    outCount: number;
    lowCount: number;
    items: { id: number; name: string; unit: string; stock: number; min: number; level: "out" | "low" }[];
  };
  debts: { total: number; count: number; top: { id: number; name: string; balance: number }[] };
  dues: {
    overdueCount: number;
    total: number;
    items: { id: string; kind: string; label: string; amount: number; dueDate: string; href: string; overdue: boolean }[];
  };
};

const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// Fechas "solo día": se muestran con el día UTC para que no se corran un día en Argentina
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

function Card({
  title,
  icon: Icon,
  href,
  linkText,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="flex min-w-0 items-center gap-2 font-semibold text-gray-900">
          <Icon className="h-[18px] w-[18px] shrink-0 text-amber-600" />
          {title}
        </h2>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-amber-700 hover:text-amber-800">
            {linkText ?? "Ver todo"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-500">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      {children}
    </div>
  );
}

export default function AdminHomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch("/api/stats/admin/home")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return <div className="p-6 text-sm text-red-600">No se pudo cargar el resumen. Probá recargar la página.</div>;
  }
  if (!data) return <PageSkeleton />;

  const { sales, pending, deliveriesToday, stock, debts, dues } = data;
  const diff = sales.prevMonthTotal > 0 ? ((sales.monthTotal - sales.prevMonthTotal) / sales.prevMonthTotal) * 100 : null;
  const todayText = new Date(`${data.today}T12:00:00Z`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  const kpis = [
    {
      label: "Ventas del mes",
      value: money(sales.monthTotal),
      detail:
        diff === null ? (
          `${sales.monthCount} ventas`
        ) : (
          <span className={`inline-flex items-center gap-1 ${diff >= 0 ? "text-green-700" : "text-red-600"}`}>
            {diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(0)}% vs. mes pasado
          </span>
        ),
    },
    { label: "Vendido hoy", value: money(sales.todayTotal), detail: `${sales.todayCount} ${sales.todayCount === 1 ? "venta" : "ventas"}` },
    {
      label: "Pedidos para preparar",
      value: String(pending.count),
      detail: deliveriesToday.length ? `${deliveriesToday.length} para entregar hoy` : "Ninguno para entregar hoy",
    },
    { label: "A cobrar", value: money(debts.total), detail: `${debts.count} ${debts.count === 1 ? "cliente debe" : "clientes deben"}` },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-gradient-to-b from-amber-50 via-white to-white p-4 md:p-6">
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        <div className="p-5 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Inicio</h1>
          <p className="mt-1 text-sm text-gray-600">
            {todayText.charAt(0).toUpperCase() + todayText.slice(1)} · lo importante del día
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500">{k.label}</div>
            <div className="mt-1 truncate text-xl font-bold text-gray-900 md:text-2xl">{k.value}</div>
            <div className="mt-1 text-xs text-gray-500">{k.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Pedidos para preparar" icon={ClipboardList} href="/dashboard" linkText="Ver pedidos">
          {deliveriesToday.length > 0 && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <Truck className="h-4 w-4" /> Para entregar hoy
              </div>
              <div className="flex flex-wrap gap-2">
                {deliveriesToday.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard?orderId=${o.id}`}
                    className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs font-medium hover:bg-amber-100"
                  >
                    #{o.id} · {o.client}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {pending.orders.length === 0 ? (
            <Empty>No hay pedidos pendientes.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pending.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/dashboard?orderId=${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        #{o.id} · {o.client}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.deliveryDate ? `Entrega ${dayLabel(o.deliveryDate)}` : "Sin fecha de entrega"}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-gray-900">{money(o.total)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pending.count > pending.orders.length && (
            <div className="border-t border-gray-100 px-5 py-2 text-xs text-gray-500">
              y {pending.count - pending.orders.length} más
            </div>
          )}
        </Card>

        <Card title="Stock bajo" icon={PackageX} href="/dashboard/admin/products" linkText="Productos">
          {stock.items.length === 0 ? (
            <Empty>Todo el stock está por encima del mínimo.</Empty>
          ) : (
            <>
              <div className="flex gap-4 px-5 pt-3 text-xs text-gray-500">
                {stock.outCount > 0 && <span className="font-medium text-red-600">{stock.outCount} sin stock</span>}
                {stock.lowCount > 0 && <span className="font-medium text-amber-700">{stock.lowCount} por debajo del mínimo</span>}
              </div>
              <ul className="divide-y divide-gray-100">
                {stock.items.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.unit} · mínimo {p.min}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.level === "out" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.level === "out" ? "Sin stock" : `Quedan ${p.stock}`}
                    </span>
                  </li>
                ))}
              </ul>
              {stock.outCount + stock.lowCount > stock.items.length && (
                <div className="border-t border-gray-100 px-5 py-2 text-xs text-gray-500">
                  y {stock.outCount + stock.lowCount - stock.items.length} más
                </div>
              )}
            </>
          )}
        </Card>

        <Card title="Vencimientos" icon={CalendarClock}>
          {dues.items.length === 0 ? (
            <Empty>No hay pagos vencidos ni por vencer esta semana.</Empty>
          ) : (
            <>
              <div className="px-5 pt-3 text-xs text-gray-500">
                Vencidos y próximos 7 días · {money(dues.total)}
                {dues.overdueCount > 0 && (
                  <span className="ml-2 font-medium text-red-600">
                    {dues.overdueCount} {dues.overdueCount === 1 ? "vencido" : "vencidos"}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-gray-100">
                {dues.items.map((d) => (
                  <li key={d.id}>
                    <Link href={d.href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">{d.label}</div>
                        <div className={`flex items-center gap-1 text-xs ${d.overdue ? "font-medium text-red-600" : "text-gray-500"}`}>
                          {d.overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                          {d.overdue ? "Venció" : "Vence"} el {dayLabel(d.dueDate)} · {d.kind === "proveedor" ? "Proveedor" : "Gasto"}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-gray-900">{money(d.amount)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Clientes que más deben" icon={Wallet} href="/dashboard/admin" linkText="Clientes">
          {debts.top.length === 0 ? (
            <Empty>Ningún cliente tiene deuda.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {debts.top.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="truncate text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="shrink-0 text-sm font-semibold text-red-600">{money(c.balance)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
