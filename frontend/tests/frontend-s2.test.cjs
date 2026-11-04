const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Use the production TypeScript helpers without adding a second test toolchain.
function loadTypeScript(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function("exports", "require", result.outputText)(exports, require);
  return exports;
}

const { readCatalogQuery, catalogHref, catalogPrice, homeProductSlugs, CATALOG_PAGE_SIZE } = loadTypeScript("src/lib/catalog.ts");
const { contactSchema } = loadTypeScript("src/components/public/contact.schema.ts");

test("CP-S2-URL-01: Todo defaults to the first page with nine products requested", () => {
  assert.deepEqual(readCatalogQuery(new URLSearchParams()), { category: "", sort: "featured", page: 1, error: null });
  assert.equal(CATALOG_PAGE_SIZE, 9);
  assert.equal(catalogHref({ category: "", sort: "featured", page: 1 }), "/menu");
});

test("CP-S2-URL-02: reload/back can reconstruct category, order and page from the URL", () => {
  const selection = { category: "cafe-clasico", sort: "az", page: 2 };
  const href = catalogHref(selection);
  assert.equal(href, "/menu?category=cafe-clasico&sort=az&page=2");
  assert.deepEqual(readCatalogQuery(new URL(href, "http://localhost").searchParams), { ...selection, error: null });
});

test("CP-S2-URL-03: a selection reset preserves the other filter and removes the old page", () => {
  const current = readCatalogQuery(new URLSearchParams("category=postres&sort=az&page=5"));
  assert.equal(catalogHref({ ...current, category: "panaderia", page: 1 }), "/menu?category=panaderia&sort=az");
  assert.equal(catalogHref({ ...current, sort: "featured", page: 1 }), "/menu?category=postres");
});

test("CP-S2-URL-04: invalid pages are rejected instead of fetched or silently rendered", () => {
  for (const page of ["0", "-1", "1.5", "abc", "1e2", "01", "100001", "9007199254740993", ""]) {
    assert.ok(readCatalogQuery(new URLSearchParams({ page })).error, `Expected rejection: ${page}`);
  }
  assert.equal(readCatalogQuery(new URLSearchParams("page=100000")).error, null);
});

test("CP-S2-URL-05: duplicated parameters, unsupported sorts and unsafe category slugs fail", () => {
  for (const raw of ["page=1&page=2", "sort=az&sort=featured", "category=a&category=b", "sort=price", "category=../secret", "category=Caf%C3%A9", "category=--", "category=-postres", "category=postres-"]) {
    assert.ok(readCatalogQuery(new URLSearchParams(raw)).error, `Expected rejection: ${raw}`);
  }
  assert.equal(readCatalogQuery(new URLSearchParams("category=novedades")).error, null);
});

test("CP-S2-HOME-01: the four unchanged Home selections resolve to distinct stable slugs", () => {
  assert.deepEqual(homeProductSlugs, { 1: "latte-signature", 2: "croissant-de-mantequilla", 3: "cold-brew-special", 4: "cheesecake-de-frutos-rojos" });
  assert.equal(new Set(Object.values(homeProductSlugs)).size, 4);
});

test("CP-S2-PRICE-01: missing prices remain unavailable and real cent amounts are formatted", () => {
  assert.equal(catalogPrice(null), "Precio no disponible");
  assert.match(catalogPrice(450), /4[.,]50/);
  assert.match(catalogPrice(0), /0[.,]00/);
});

const validContact = { name: "  María López  ", email: "  MARIA@example.com  ", message: "  Deseo consultar el horario de apertura.  " };

test("CP-S2-CONTACT-01: contact data is trimmed and email normalized before the API call", () => {
  assert.deepEqual(contactSchema.parse(validContact), { name: "María López", email: "maria@example.com", message: "Deseo consultar el horario de apertura." });
});

test("CP-S2-CONTACT-02: required fields, malformed email and short messages are rejected", () => {
  for (const invalid of [{ name: " " }, { name: "A" }, { email: "bad-email" }, { message: "corto" }, { message: "          " }]) {
    assert.equal(contactSchema.safeParse({ ...validContact, ...invalid }).success, false);
  }
});

test("CP-S2-CONTACT-03: client length limits match the server contract", () => {
  assert.equal(contactSchema.safeParse({ ...validContact, name: "a".repeat(100), message: "a".repeat(3000) }).success, true);
  for (const invalid of [{ name: "a".repeat(101) }, { email: `${"a".repeat(250)}@example.com` }, { message: "a".repeat(3001) }]) {
    assert.equal(contactSchema.safeParse({ ...validContact, ...invalid }).success, false);
  }
});
