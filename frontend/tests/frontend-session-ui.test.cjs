const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");
const customer = { id: "customer-id", name: "Cliente demo", email: "cliente@example.test", phone: null, role: "customer" };
const admin = { ...customer, id: "admin-id", name: "Administrador", role: "admin" };
const bookingFile = "src/components/public/ReservationForm.tsx";
const config = { timezone: "America/El_Salvador", openingHour: 7, closingHour: 21, slotMinutes: 60, capacity: 20, minPeople: 1, maxPeople: 6, minNoticeMinutes: 30, maxAdvanceDays: 30 };
const availability = { date: "2099-01-12", timezone: config.timezone, slots: [{ startsAt: "2099-01-12T16:00:00.000Z", time: "10:00", available: true, remaining: 20 }] };

// Render the production components. Only routing, authentication and the settled
// reservation request state are supplied; assertions inspect rendered controls.
function render(relative, exported, { user = null, ready = true, pathname = "/", query = "", states = {}, props = {} } = {}) {
  const modules = new Map();
  const router = { push() {}, replace() {}, refresh() {} };
  const auth = { user, ready, sessionError: "", logout: async () => {}, refresh: async () => {} };
  const Link = ({ href, children, prefetch, replace, scroll, ...rest }) => React.createElement("a", { ...rest, href }, children);
  const Image = ({ priority, fill, sizes, unoptimized, ...rest }) => React.createElement("img", rest);

  function load(filename) {
    filename = path.resolve(filename);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const relativeName = path.relative(root, filename).split(path.sep).join("/");
    let stateIndex = 0;
    const injectedStates = states[relativeName];
    const react = injectedStates ? { ...React, useState(initial) {
      const index = stateIndex++;
      return React.useState(index < injectedStates.length ? injectedStates[index] : initial);
    } } : React;
    const localRequire = (specifier) => {
      if (specifier === "react") return react;
      if (specifier === "next/link") return Link;
      if (specifier === "next/image") return Image;
      if (specifier === "next/navigation") return { usePathname: () => pathname, useSearchParams: () => new URLSearchParams(query), useRouter: () => router };
      if (specifier === "@/hooks/useAuth") return { useAuth: () => auth };
      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
        const target = [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        assert.ok(target, `Cannot resolve ${specifier} from ${filename}`);
        return load(target);
      }
      return require(specifier);
    };
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire, process: { env: {} }, URL, URLSearchParams, Headers, Response, Event, Error, TypeError, Date, Intl, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout }, { filename });
    return module.exports;
  }

  const Component = load(path.join(root, relative))[exported];
  assert.equal(typeof Component, "function", `Missing component ${exported}`);
  return renderToStaticMarkup(React.createElement(Component, props));
}

function controls(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "g"))].map((match) => ({
    attributes: match[1],
    href: match[1].match(/\bhref="([^"]*)"/)?.[1].replaceAll("&amp;", "&"),
    text: match[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
  }));
}

function header(options) {
  return controls(render("src/components/public/PublicHeader.tsx", "PublicHeader", options), "a");
}

function booking(options = {}) {
  const { confirmed = null, loading = false, ready = true, user = customer, time = "10:00", resultPeople = 2, ...rest } = options;
  return render(bookingFile, "ReservationForm", {
    pathname: "/reservas", query: "date=2099-01-12&people=2" + (time ? "&time=" + encodeURIComponent(time) : ""), user, ready,
    states: { [bookingFile]: [config, "", 0, { date: availability.date, people: resultPeople, data: availability }, loading, "", 0, "", confirmed, false] }, ...rest,
  });
}

test("CP-UI-SESSION-01: la cabecera espera la sesión antes de ofrecer registro", () => {
  const links = header({ ready: false });
  assert.equal(links.filter((link) => ["/registro", "/login", "/perfil", "/admin"].includes(link.href)).length, 0);
  assert.equal(links.filter((link) => link.href === "/reservas").length, 1);
});

test("CP-UI-SESSION-02: un invitado ve un único Registro en la navegación pública", () => {
  const links = header({ pathname: "/menu" });
  assert.deepEqual(links.filter((link) => ["/registro", "/login", "/perfil", "/admin"].includes(link.href)).map(({ href, text }) => ({ href, text })), [{ href: "/registro", text: "Registro" }]);
});

test("CP-UI-SESSION-03: cliente autenticado ve Mi cuenta y no Registro ni Login", () => {
  const links = header({ user: customer, pathname: "/perfil" });
  assert.deepEqual(links.filter((link) => ["/registro", "/login", "/perfil", "/admin"].includes(link.href)).map(({ href, text }) => ({ href, text })), [{ href: "/perfil", text: "Mi cuenta" }]);
});

test("CP-UI-SESSION-04: administrador ve ERP con su destino correcto", () => {
  const links = header({ user: admin, pathname: "/reservas" });
  assert.deepEqual(links.filter((link) => ["/registro", "/login", "/perfil", "/admin"].includes(link.href)).map(({ href, text }) => ({ href, text })), [{ href: "/admin", text: "ERP" }]);
});

test("CP-UI-SESSION-05: los formularios de acceso no duplican sus enlaces en la cabecera", () => {
  for (const pathname of ["/login", "/registro"]) {
    const links = header({ pathname });
    assert.equal(links.filter((link) => ["/registro", "/login"].includes(link.href)).length, 0, pathname);
  }
});

test("CP-UI-SESSION-06: perfil ofrece cada acción una vez sin una segunda barra de cuenta", () => {
  const html = render("src/components/customer/CustomerProfile.tsx", "CustomerProfile", { user: customer, pathname: "/perfil" });
  const links = controls(html, "a");
  assert.deepEqual(links.map(({ href, text }) => ({ href, text })).sort((a, b) => a.href.localeCompare(b.href)), [
    { href: "/perfil/configuracion", text: "Editar mis datos" },
    { href: "/perfil/reservas", text: "Ver mis reservas" },
  ]);
  assert.equal(controls(html, "button").filter((button) => button.text === "Cerrar sesión").length, 1);
  assert.doesNotMatch(html, /<nav\b/);
});

test("CP-UI-SESSION-07: el perfil administrativo conserva una sola entrada al ERP", () => {
  const html = render("src/components/customer/CustomerProfile.tsx", "CustomerProfile", { user: admin, pathname: "/perfil" });
  assert.equal(controls(html, "a").filter((link) => link.href === "/admin" && link.text === "Abrir ERP").length, 1);
  assert.equal(controls(html, "button").filter((button) => button.text === "Cerrar sesión").length, 1);
});

test("CP-UI-RESERVA-01: visitante elige horario y tiene una sola acción para iniciar sesión", () => {
  const html = booking({ user: null });
  const buttons = controls(html, "button");
  const confirm = buttons.filter((button) => button.text === "Iniciar sesión para confirmar");
  assert.equal(confirm.length, 1);
  assert.doesNotMatch(confirm[0].attributes, /\sdisabled(?:=|\s|$)/);
  assert.equal(controls(html, "a").filter((link) => link.href?.startsWith("/login") || link.href === "/reservas").length, 0);
  assert.equal(buttons.filter((button) => button.text === "Confirmar reserva").length, 0);
  assert.equal((html.match(/<form\b/g) || []).length, 1);
});

test("CP-UI-RESERVA-02: cliente ve Mis reservas una vez y una única confirmación", () => {
  const html = booking();
  const links = controls(html, "a");
  const confirm = controls(html, "button").filter((button) => button.text === "Confirmar reserva");
  assert.equal(links.filter((link) => link.href === "/perfil/reservas" && link.text === "Mis reservas").length, 1);
  assert.equal(links.filter((link) => link.href === "/reservas" || link.href?.startsWith("/login")).length, 0);
  assert.equal(confirm.length, 1);
  assert.doesNotMatch(confirm[0].attributes, /\sdisabled(?:=|\s|$)/);
});

test("CP-UI-RESERVA-03: no se puede confirmar sin horario o mientras se consulta disponibilidad o sesión", () => {
  for (const state of [{ time: "" }, { loading: true }, { ready: false }]) {
    const html = booking(state);
    const confirm = controls(html, "button").find((button) => button.text === "Confirmar reserva" || button.text === "Comprobando sesión…");
    assert.ok(confirm, `Missing disabled confirmation for ${JSON.stringify(state)}`);
    assert.match(confirm.attributes, /\sdisabled(?:=|\s|$)/, JSON.stringify(state));
  }
});

test("CP-UI-RESERVA-04: al confirmar se muestra un comprobante sin formulario editable ni segundo envío", () => {
  const confirmed = { id: "reservation-id", startsAt: availability.slots[0].startsAt, people: 2, status: "confirmed", createdAt: "2099-01-01T12:00:00.000Z" };
  const html = booking({ confirmed });
  assert.doesNotMatch(html, /<form\b|<input\b|<select\b/);
  assert.match(html, /Reserva confirmada/);
  assert.equal(controls(html, "a").filter((link) => link.href === "/perfil/reservas/reservation-id" && link.text === "Ver mi reserva").length, 1);
  const actions = [...controls(html, "a"), ...controls(html, "button")];
  assert.equal(actions.filter((control) => control.text === "Hacer otra reserva").length, 1);
  assert.equal(actions.filter((control) => control.text === "Confirmar reserva").length, 0);
});

test("CP-UI-RESERVA-05: una respuesta del grupo anterior no habilita una nueva confirmación", () => {
  const html = booking({ resultPeople: 1 });
  const buttons = controls(html, "button");
  const confirm = buttons.find((button) => button.text === "Confirmar reserva");
  assert.ok(confirm);
  assert.match(confirm.attributes, /\sdisabled(?:=|\s|$)/);
  assert.equal(buttons.filter((button) => /cupos/.test(button.text)).length, 0);
});
