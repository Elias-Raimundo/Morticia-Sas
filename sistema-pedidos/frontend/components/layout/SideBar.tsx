"use client";

import { useAuth } from "@/context/Auth.context";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  if (loading) return null;
  if (!user) return null;

  const isAdmin = user.role === "admin";

  const links = isAdmin
    ? [
        { href: "/dashboard", label: "Pedidos" },
        { href: "/dashboard/admin", label: "Administración" },
        { href: "/dashboard/admin/products", label: "Productos" },
      ]
    : [
        { href: "/dashboard", label: "Crear pedido" },
        { href: "/dashboard/historial", label: "Historial de pedidos" },
        { href: "/dashboard/saldos", label: "Saldos" },
      ];

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img
            src="/logo2.jpeg"
            alt="Morticia"
            className="w-11 h-11 rounded-lg object-cover border border-gray-200"
          />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Morticia-SAS</h2>
            <p className="text-xs text-gray-500">
              {isAdmin ? "Panel administrativo" : "Portal de pedidos"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-2 text-sm p-4">
        {links.map((link) => {
          const active =
            pathname === link.href;


          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 transition font-medium ${
                active
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500 mb-1">Sesión iniciada</div>
          <div className="text-sm text-gray-700 truncate">{user.email}</div>
        </div>

        <button
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          onClick={logout}
        >
          Salir
        </button>
      </div>
    </aside>
  );
}