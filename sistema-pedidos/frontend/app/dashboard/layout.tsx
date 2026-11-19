"use client";

import { useAuth } from "@/context/Auth.context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/layout/SideBar";
import { apiFetch } from "@/lib/api";
import ChangePasswordModal from "@/components/accounts/ChangePasswordModal";
import { Bell, Trash2, UserRound } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/Skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(0);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // Menú de cuenta (solo celular: en la compu está en la barra lateral)
  const [openAccount, setOpenAccount] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [billing, setBilling] = useState<{
    state: "ok" | "warning" | "readonly";
    monthName?: string;
    readOnlyFromDay?: number;
    contact?: string | null;
  }>({ state: "ok" });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          apiFetch("/api/notifications/unread-count"),
          apiFetch("/api/notifications?read=false"),
        ]);

        const countData = await countRes.json().catch(() => ({}));
        const listData = await listRes.json().catch(() => []);

        if (countRes.ok) {
          setNotifications(countData.count || 0);
        }

        if (listRes.ok) {
          setNotificationList(Array.isArray(listData) ? listData : []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchNotifications();

    const pollingInterval = user.role === "admin" ? 5000 : 30000;
    const interval = setInterval(fetchNotifications, pollingInterval);

    return () => clearInterval(interval);
  }, [user]);

  // Estado de la mensualidad del sistema (el aviso de vencimiento solo le llega al admin)
  useEffect(() => {
    if (!user) return;

    const fetchBilling = async () => {
      try {
        const res = await apiFetch("/api/billing/status");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data?.state) setBilling(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchBilling();
    const interval = setInterval(fetchBilling, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenNotifications(false);
      }
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setOpenAccount(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) return <FullScreenLoader />;
  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-4 pb-24 md:pb-0">
        <div className="mb-4 flex justify-end gap-2">
          <div ref={accountRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => setOpenAccount((prev) => !prev)}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm"
              title="Mi cuenta"
            >
              <UserRound className="h-5 w-5 text-gray-700" />
            </button>

            {openAccount && (
              <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b px-4 py-3">
                  <div className="text-xs text-gray-500">Sesión iniciada</div>
                  <div className="truncate text-sm text-gray-800">{user.email}</div>
                </div>
                <button
                  type="button"
                  className="block w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setOpenAccount(false);
                    setChangePasswordOpen(true);
                  }}
                >
                  Cambiar contraseña
                </button>
                <button
                  type="button"
                  className="block w-full border-t px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={logout}
                >
                  Salir
                </button>
              </div>
            )}
          </div>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenNotifications((prev) => !prev)}
              className="relative rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm"
            >
              <Bell className="h-5 w-5 text-gray-700" />

              {notifications > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                  {notifications}
                </span>
              )}
            </button>

            {openNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                  <p className="text-xs text-gray-500">
                    Pedidos nuevos y novedades
                  </p>
                </div>

                <div className="max-h-80 overflow-auto">
                  {notificationList.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No hay notificaciones nuevas.
                    </div>
                  ) : (
                    notificationList.map((n) => (
                      <div
                        key={n.id}
                        className="border-b px-4 py-3 text-sm hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/notifications/${n.id}/read`, {
                                  method: "PATCH",
                                });

                                setNotificationList((prev) =>
                                  prev.filter((item) => item.id !== n.id)
                                );
                                setNotifications((prev) => Math.max(prev - 1, 0));
                                setOpenNotifications(false);

                                if (n.orderId) {
                                  router.push(`/dashboard?orderId=${n.orderId}`);
                                }
                              } catch (error) {
                                console.error(error);
                              }
                            }}
                          >
                            <div className="font-medium text-gray-900">
                              {n.message}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {new Date(n.createdAt).toLocaleString("es-AR")}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();

                              try {
                                await apiFetch(`/api/notifications/${n.id}`, {
                                  method: "DELETE",
                                });

                                setNotificationList((prev) =>
                                  prev.filter((item) => item.id !== n.id)
                                );
                                setNotifications((prev) => Math.max(prev - 1, 0));
                              } catch (error) {
                                console.error(error);
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t px-4 py-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await apiFetch("/api/notifications/read-all", {
                          method: "PATCH",
                        });

                        if (!res.ok) return;

                        setNotifications(0);
                        setNotificationList([]);
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    className="text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    Marcar todas como leídas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {billing.state === "warning" && isAdmin && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Tu mensualidad{billing.monthName ? ` de ${billing.monthName}` : ""} está vencida.</span>{" "}
            Regularizala antes del {billing.readOnlyFromDay ?? 15} para no perder la posibilidad de cargar y modificar datos:
            pasada esa fecha el sistema queda en modo solo lectura.
            {billing.contact ? ` Contacto: ${billing.contact}.` : ""}
          </div>
        )}

        {billing.state === "readonly" && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            {isAdmin ? (
              <>
                <span className="font-semibold">Sistema en modo solo lectura por falta de pago de la mensualidad.</span>{" "}
                Podés consultar toda la información, pero no cargar ni modificar datos hasta regularizar el pago.
                {billing.contact ? ` Contacto: ${billing.contact}.` : ""}
              </>
            ) : (
              <>
                <span className="font-semibold">El sistema está en modo solo lectura por el momento.</span>{" "}
                Podés consultar tu información, pero no hacer pedidos nuevos. Contactá al local.
              </>
            )}
          </div>
        )}

        {children}
      </main>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}