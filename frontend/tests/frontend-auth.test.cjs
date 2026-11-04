const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, globals = {}) {
  const filename = path.join(__dirname, "..", relative);
  const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, require, process: { env: {} }, URL, URLSearchParams, Headers, Response, Event, Error, TypeError, Date, Intl, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout, ...globals };
  vm.runInNewContext(js, context, { filename });
  return module.exports;
}

test("CP-S3-U01 next acepta únicamente destinos privados o reservas internos", () => {
  const { safeNext, loginHref } = load("src/lib/auth.ts");
  const valid = "/reservas?date=2026-11-12&people=3&time=10%3A00";
  assert.equal(safeNext(valid), valid);
  assert.equal(safeNext("/perfil/reservas/123-ab"), "/perfil/reservas/123-ab");
  assert.equal(safeNext("/admin"), "/admin");
  assert.equal(safeNext("/admin/contactos?search=Ana"), "/admin/contactos?search=Ana");
  for (const value of [null, "", "https://evil.test", "//evil.test", "/\\evil.test", "/admin/no-existe", "/login?next=/admin", "/%2f%2fevil.test", "/perfil/../admin", "/reservas\n"]) {
    assert.equal(safeNext(value), "/perfil", String(value));
  }
  assert.equal(loginHref(valid), "/login?next=" + encodeURIComponent(valid));
  assert.equal(loginHref("/admin/menu"), "/login?next=%2Fadmin%2Fmenu");
});

test("CP-S3-U12 destino posterior al login respeta el rol y conserva un next explícito seguro", () => {
  const { postLoginDestination } = load("src/lib/auth.ts");
  assert.equal(postLoginDestination("admin", null), "/admin");
  assert.equal(postLoginDestination("admin", "/admin/reservas"), "/admin/reservas");
  assert.equal(postLoginDestination("admin", "/perfil"), "/perfil");
  assert.equal(postLoginDestination("admin", "/reservas?date=2026-11-12&people=3&time=10%3A00"), "/reservas?date=2026-11-12&people=3&time=10%3A00");
  assert.equal(postLoginDestination("admin", "https://evil.test"), "/admin");
  assert.equal(postLoginDestination("customer", "/admin/menu"), "/perfil");
  assert.equal(postLoginDestination("customer", "/reservas?people=3"), "/reservas?people=3");
  assert.equal(postLoginDestination("customer", null), "/perfil");
  for (const value of ["", "//evil.test", "/perfil/../admin", "/admin/no-existe", "/login?next=/admin"]) {
    assert.equal(postLoginDestination("admin", value), "/admin");
    assert.equal(postLoginDestination("customer", value), "/perfil");
  }
});

test("CP-S3-U14 cambiar entre login y registro conserva la reserva y el destino por defecto del rol", () => {
  const { authPageHref, postLoginDestination } = load("src/lib/auth.ts");
  const selection = "/reservas?date=2026-11-12&people=3&time=10%3A00";
  const registration = new URL(authPageHref("/registro", selection), "https://coffee.test");
  const login = new URL(authPageHref("/login", registration.searchParams.get("next")), "https://coffee.test");
  assert.equal(login.searchParams.get("next"), selection);
  assert.equal(postLoginDestination("admin", login.searchParams.get("next")), selection);
  assert.equal(postLoginDestination("customer", login.searchParams.get("next")), selection);
  for (const value of [null, undefined, "", "https://evil.test", "/perfil/../admin"]) {
    assert.equal(authPageHref("/registro", value), "/registro");
    assert.equal(authPageHref("/login", value), "/login");
  }
  assert.equal(authPageHref("/login", "/admin/menu"), "/login?next=%2Fadmin%2Fmenu");
});

test("CP-S3-U13 login admite alias demo con 1234; el registro mantiene mínimo de ocho caracteres", () => {
  const { loginSchema, registerSchema } = load("src/lib/auth-validation.ts");
  for (const email of ["admin", "cliente", "  ADMIN  ", "cliente@example.com"]) assert.equal(loginSchema.safeParse({ email, password: "1234" }).success, true);
  assert.equal(loginSchema.parse({ email: " ADMIN ", password: "1234" }).email, "admin");
  assert.equal(loginSchema.safeParse({ email: "otro-alias", password: "1234" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "admin", password: "" }).success, false);
  assert.equal(registerSchema.safeParse({ name: "Cliente", email: "cliente@example.com", password: "1234", confirm: "1234" }).success, false);
});

test("CP-S3-U02 toda escritura usa CSRF, cookie y no-store preservando idempotencia", async () => {
  const calls = [];
  const { api } = load("src/lib/api.ts", { fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith("/csrf") ? { csrfToken: "signed-test-token" } : { id: "saved" });
  } });
  const controller = new AbortController();
  const result = await api("/reservations", { method: "POST", body: JSON.stringify({ people: 2 }), headers: { "Idempotency-Key": "test-idempotency" }, signal: controller.signal, credentials: "omit", cache: "force-cache" });
  assert.equal(result.id, "saved");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "http://localhost:4000/api/csrf");
  for (const call of calls) { assert.equal(call.options.credentials, "include"); assert.equal(call.options.cache, "no-store"); assert.ok(call.options.signal instanceof AbortSignal); }
  assert.equal(calls[1].options.headers.get("X-CSRF-Token"), "signed-test-token");
  assert.equal(calls[1].options.headers.get("Idempotency-Key"), "test-idempotency");
  assert.equal(calls[1].options.headers.get("Content-Type"), "application/json");
});

test("CP-S3-U03 GET no crea solicitudes CSRF y soporta aborto", async () => {
  let calls = 0;
  const controller = new AbortController();
  const abort = new Error("Cancelled"); abort.name = "AbortError";
  const { api } = load("src/lib/api.ts", { fetch: async (_url, options) => { calls++; assert.ok(options.signal instanceof AbortSignal); throw abort; } });
  await assert.rejects(api("/reservations", { signal: controller.signal }), (error) => error.name === "AbortError");
  assert.equal(calls, 1);
});

test("CP-S3-U04 un error de red no devuelve éxito ni datos de ejemplo", async () => {
  const { api } = load("src/lib/api.ts", { fetch: async () => { throw new TypeError("network"); } });
  await assert.rejects(api("/reservations"), (error) => error.status === 0 && error.message.includes("conectar"));
});

test("CP-S3-U05 errores 500 ocultan mensajes internos", async () => {
  const { api } = load("src/lib/api.ts", { fetch: async () => Response.json({ message: "postgres password=secret stack" }, { status: 500 }) });
  await assert.rejects(api("/profile"), (error) => error.status === 500 && !error.message.includes("secret") && error.message.includes("servicio"));
});

test("CP-S3-U06 401 protegido invalida contexto y conserva el rechazo", async () => {
  const events = [];
  const { api } = load("src/lib/api.ts", { window: { dispatchEvent: (event) => events.push(event.type) }, fetch: async () => Response.json({}, { status: 401 }) });
  await assert.rejects(api("/profile"), (error) => error.status === 401);
  assert.deepEqual(events, ["coffee:session-expired"]);
});

test("CP-S3-U07 CSRF rechazado bloquea escritura", async () => {
  const urls = [];
  const { api } = load("src/lib/api.ts", { fetch: async (url) => { urls.push(url); return Response.json({ message: "CSRF" }, { status: 403 }); } });
  await assert.rejects(api("/profile", { method: "PATCH", body: "{}" }), (error) => error.status === 403);
  assert.equal(urls.length, 1);
  assert.ok(urls[0].endsWith("/csrf"));
});

test("CP-S3-U08 fechas se presentan en la zona del negocio, no la del equipo", () => {
  const { businessDate, formatReservation } = load("src/lib/reservations.ts");
  assert.equal(businessDate("America/El_Salvador", new Date("2026-11-02T02:00:00Z")), "2026-11-01");
  const display = formatReservation("2026-11-02T16:00:00Z", "America/El_Salvador");
  assert.ok(display.includes("10:00"), display);
});

test("CP-S3-U09 registro normaliza correo y valida confirmación y límite bcrypt UTF8", () => {
  const { registerSchema } = load("src/lib/auth-validation.ts");
  const valid = { name: "  Cliente Test  ", email: "  TEST@EXAMPLE.COM ", password: "correct-password", confirm: "correct-password" };
  const parsed = registerSchema.parse(valid);
  assert.equal(parsed.email, "test@example.com");
  assert.equal(parsed.name, "Cliente Test");
  assert.equal(registerSchema.safeParse({ ...valid, confirm: "different" }).success, false);
  assert.equal(registerSchema.safeParse({ ...valid, password: "x".repeat(73), confirm: "x".repeat(73) }).success, false);
  assert.equal(registerSchema.safeParse({ ...valid, password: "é".repeat(37), confirm: "é".repeat(37) }).success, false);
});

test("CP-S3-U10 perfil acepta teléfono opcional y rechaza formatos inválidos", () => {
  const { profileSchema } = load("src/lib/auth-validation.ts");
  assert.equal(profileSchema.safeParse({ name: "Cliente", phone: "" }).success, true);
  assert.equal(profileSchema.safeParse({ name: "Cliente", phone: "+503 7000-0000" }).success, true);
  assert.equal(profileSchema.safeParse({ name: "C", phone: "abc" }).success, false);
});

test("CP-S3-U11 petición sin respuesta termina por timeout y permite reintentar", async () => {
  const { api } = load("src/lib/api.ts", {
    setTimeout: (callback) => { queueMicrotask(callback); return 1; },
    clearTimeout: () => {},
    fetch: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => { const error = new Error("Aborted"); error.name = "AbortError"; reject(error); });
    }),
  });
  await assert.rejects(api("/reservations"), (error) => error.status === 0 && error.message.includes("tardó"));
});
