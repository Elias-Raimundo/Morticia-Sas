"use client";

import { useAuth } from "@/context/Auth.context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ChangePasswordModal from "@/components/accounts/ChangePasswordModal";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  History,
  House,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  short?: string; // etiqueta corta para el menú del celular
  icon: LucideIcon;
};

const ADMIN_LINKS: NavLink[] = [
  { href: "/dashboard/admin/inicio", label: "Inicio", icon: House },
  { href: "/dashboard", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/admin/ventas", label: "Venta al público", short: "Ventas", icon: Store },
  { href: "/dashboard/admin/products", label: "Productos", icon: Package },
  { href: "/dashboard/admin", label: "Administración", short: "Clientes", icon: Users },
  { href: "/dashboard/admin/resumen", label: "Resumen", icon: BarChart3 },
  { href: "/dashboard/admin/proveedores", label: "Proveedores", icon: Truck },
  { href: "/dashboard/admin/gastos", label: "Gastos", icon: Receipt },
  { href: "/dashboard/admin/bienes", label: "Bienes", icon: Briefcase },
  { href: "/dashboard/admin/auditoria", label: "Auditoría", icon: ScrollText },
  { href: "/dashboard/admin/configuracion", label: "Configuración", icon: Settings },
];

const CLIENT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Crear pedido", icon: ShoppingCart },
  { href: "/dashboard/historial", label: "Historial de pedidos", short: "Historial", icon: History },
  { href: "/dashboard/saldos", label: "Saldos", icon: Wallet },
];

// Cuántos accesos fijos tiene el admin en la barra inferior del celular (el resto va en "Más")
const ADMIN_MOBILE_PRIMARY = 5;

// "/dashboard" y "/dashboard/admin" son prefijo de otras secciones: solo cuentan exactos.
const isActive = (pathname: string, href: string) =>
  pathname === href ||
  (href !== "/dashboard" && href !== "/dashboard/admin" && pathname.startsWith(`${href}/`));

export default function Sidebar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  // El panel "Más" guarda en qué página se abrió: al navegar a otra se cierra solo.
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null);
  const moreOpen = moreOpenAt === pathname;
  const setMoreOpen = (open: boolean) => setMoreOpenAt(open ? pathname : null);

  if (loading) return null;
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const links = isAdmin ? ADMIN_LINKS : CLIENT_LINKS;
  const mobilePrimary = isAdmin ? links.slice(0, ADMIN_MOBILE_PRIMARY) : links;
  const mobileMore = isAdmin ? links.slice(ADMIN_MOBILE_PRIMARY) : [];
  const moreActive = mobileMore.some((l) => isActive(pathname, l.href));

  return (
    <>
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-4 [@media(min-height:860px)]:py-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo2.jpeg"
              alt="Morticia"
              className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Morticia-SAS</h2>
              <p className="text-xs text-gray-500">
                {isAdmin ? "Panel administrativo" : "Portal de pedidos"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-3 py-3 text-sm [@media(min-height:860px)]:gap-1 [@media(min-height:860px)]:py-4">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 font-medium transition [@media(min-height:860px)]:py-2.5 ${
                  active
                    ? "border-amber-200 bg-amber-100 text-amber-900"
                    : "border-transparent text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-amber-700" : "text-gray-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="mb-2 px-1">
            <div className="text-xs text-gray-500">Sesión iniciada</div>
            <div className="truncate text-sm text-gray-700" title={user.email}>{user.email}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={() => setChangePasswordOpen(true)}
              title="Cambiar contraseña"
            >
              <KeyRound className="h-4 w-4 text-gray-500" />
              Contraseña
            </button>

            <button
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 text-gray-500" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Celular: panel "Más" (solo admin) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-16 rounded-t-2xl border border-b-0 border-gray-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Más secciones</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {mobileMore.map((link) => {
                const active = isActive(pathname, link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium ${
                      active
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-amber-700" : "text-gray-500"}`} />
                    {link.short ?? link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Celular: barra inferior (altura fija h-16, las barras de carrito se apoyan encima) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-full">
          {mobilePrimary.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                  active ? "text-amber-700" : "text-gray-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.short ?? link.label}
              </Link>
            );
          })}

          {mobileMore.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                moreOpen || moreActive ? "text-amber-700" : "text-gray-500"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              Más
            </button>
          )}
        </div>
      </nav>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
