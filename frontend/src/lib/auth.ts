/** Only known application destinations can be used after login or registration. */
function validatedNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://internal.invalid");
    if (url.origin !== "https://internal.invalid") return null;
    if (url.pathname !== value.split(/[?#]/)[0]) return null;
    if (!/^\/(?:reservas|perfil(?:\/configuracion|\/reservas(?:\/[a-zA-Z0-9-]+)?)?|admin(?:\/(?:reservas|menu|clientes|eventos|contactos|inventario|reportes|configuracion))?)$/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}`;
  } catch { return null; }
}

export function safeNext(value: string | null | undefined): string {
  return validatedNext(value) || "/perfil";
}

/** Role-specific destinations are selected only after the server authenticates the user. */
export function postLoginDestination(role: "admin" | "customer", value: string | null | undefined): string {
  const next = validatedNext(value);
  if (!next) return role === "admin" ? "/admin" : "/perfil";
  const isAdminPath = next === "/admin" || next.startsWith("/admin/") || next.startsWith("/admin?");
  return role === "customer" && isAdminPath ? "/perfil" : next;
}

/** Keep an explicit destination when switching forms, without inventing a default. */
export function authPageHref(page: "/login" | "/registro", value: string | null | undefined): string {
  const next = validatedNext(value);
  return next ? `${page}?next=${encodeURIComponent(next)}` : page;
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(safeNext(next))}`;
}
