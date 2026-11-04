const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const evidenceFile = path.join(projectRoot, 'docs/evidence/frontend-http.json');
const base = process.argv[2];
if (!base || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Uso: node scripts/verify-http.cjs http://localhost:3001');
const results = [];
async function page(route, status, contains) {
  const response = await fetch(base + route, { signal: AbortSignal.timeout(120000) });
  const html = await response.text();
  assert.equal(response.status, status, route);
  if (contains) assert.ok(html.includes(contains), `${route}: falta ${contains}`);
  results.push({ base, route, status: response.status, result: 'Aprobado', type: 'HTTP/SSR, sin navegador' });
  return html;
}
(async () => {
  const home = await page('/', 200, 'El pequeño café,');
  for (const slug of ['latte-signature', 'croissant-de-mantequilla', 'cold-brew-special', 'cheesecake-de-frutos-rojos']) {
    assert.ok(home.includes(`href="/menu/${slug}"`), `Inicio debe enlazar ${slug}`);
    await page(`/menu/${slug}`, 200);
  }
  for (const route of ['/menu', '/eventos', '/nosotros', '/contacto', '/registro', '/login', '/reservas', '/perfil', '/admin']) await page(route, 200);
  for (const section of ['clientes', 'configuracion', 'contactos', 'eventos', 'inventario', 'menu', 'reportes', 'reservas']) await page('/admin/' + section, 200);
  for (const route of ['/menu/no-existe-qa', '/menu/mocha-deluxe', '/perfil/favoritos']) await page(route, 404);
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
