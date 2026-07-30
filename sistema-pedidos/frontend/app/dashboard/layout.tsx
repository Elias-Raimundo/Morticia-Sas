"use client";

import { useAuth } from "@/context/Auth.context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/layout/SideBar";
import { apiFetch } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(0);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 px-4 py-4 pb-24 md:pb-0">
        <div className="mb-4 flex justify-end">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenNotifications((prev) => !prev)}
              className="relative rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm"
            >
              <span className="text-lg">🔔</span>

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
                            🗑️
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

        {children}
      </main>
    </div>
  );
}