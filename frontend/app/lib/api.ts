const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  // Backend error responses are JSON, but a 5xx from a proxy/timeout can come
  // back as plain text — fall back to an empty object rather than throwing here.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : JSON.stringify(data.error) || res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, token?: string | null) => request<T>(path, { method: "GET" }, token),
  post: <T,>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, token),
  patch: <T,>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, token),
  delete: <T,>(path: string, token?: string | null) => request<T>(path, { method: "DELETE" }, token),
};

export { API_URL };
