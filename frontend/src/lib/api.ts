/** All browser requests use the HttpOnly session cookie; no credentials enter storage. */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(API_URL + path, { ...options, signal: controller.signal, credentials: "include", cache: "no-store" });
    body = response.status === 204 ? undefined : await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return undefined;
    });
  } catch (error) {
    if (timedOut && !options.signal?.aborted) throw new ApiError("El servicio tardó demasiado en responder. Inténtalo de nuevo.", 0);
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError("No pudimos conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.", 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
  if (!response.ok) {
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const fallback = response.status === 401 ? "Tu sesión no está activa. Inicia sesión para continuar."
      : response.status === 429 ? "Has realizado demasiados intentos. Espera un momento antes de volver a intentar."
        : response.status >= 500 ? "El servicio no está disponible en este momento. Inténtalo de nuevo."
          : "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.";
    const message = response.status >= 500 ? fallback : typeof payload.message === "string" ? payload.message
      : Array.isArray(payload.message) && payload.message.every((item) => typeof item === "string") ? payload.message.join(". ") : fallback;
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("coffee:session-expired"));
    }
    throw new ApiError(message, response.status, typeof payload.code === "string" ? payload.code : undefined);
  }
  return body as T;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("La ruta de API debe ser relativa.");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const { csrfToken } = await request<{ csrfToken: string }>("/csrf", { signal: options.signal });
    headers.set("X-CSRF-Token", csrfToken);
  }
  return request<T>(path, { ...options, method, headers });
}

export const api = apiRequest;
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "No se pudo completar la operación. Inténtalo de nuevo.";
}
