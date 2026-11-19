const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!BASE_URL) throw new Error("API_URL no configurada");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;
  if (!headers.get("Content-Type") && !isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Sesión vencida o cerrada (por ejemplo, porque se cambió la contraseña en otro
  // dispositivo): se borra el token y se vuelve al login. Las rutas de /api/auth quedan
  // afuera porque sus errores se muestran en el mismo formulario.
  if (res.status === 401 && token && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
    localStorage.removeItem("token");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login?expired=1";
    }
  }

  return res;
}
