const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!BASE_URL) throw new Error("API_URL no configurada");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;
  if (!headers.get("Content-Type") && !isFormData) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}