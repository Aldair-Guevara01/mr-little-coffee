const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const base = 'http://localhost:4000/api';
const stateFile = path.join(projectRoot, '.local/demo-smoke.json');
const evidenceFile = path.join(projectRoot, 'docs/evidence/demo-functional.json');
const phase = process.argv[2] || 'prepare';
const checks = [];
class Client {
  constructor(cookies = {}) { this.cookies = cookies; }
  async call(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set('Cookie', Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join('; '));
    headers.set('Origin', 'http://localhost:3000');
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(base + path, { ...options, headers, signal: AbortSignal.timeout(20000) });
    for (const value of response.headers.getSetCookie()) {
      const [name, ...parts] = value.split(';')[0].split('=');
      this.cookies[name] = parts.join('=');
    }
    return { status: response.status, body: await response.json() };
  }
  async write(path, body, headers = {}) {
    const csrf = await this.call('/csrf'); assert.equal(csrf.status, 200);
    return this.call(path, { method: 'POST', body: JSON.stringify(body || {}), headers: { ...headers, 'X-CSRF-Token': csrf.body.csrfToken } });
  }
}
function passed(title) { checks.push({ phase, title, status: 'Aprobado', type: 'HTTP con PostgreSQL real, sin navegador' }); console.log('OK: ' + title); }
(async () => {
  const health = await new Client().call('/health');
  assert.equal(health.status, 200); assert.equal(health.body.demoAccountsEnabled, true, 'Solo ejecutar contra la demostracion local habilitada.');
  if (phase === 'prepare') {
    const admin = new Client(); const customer = new Client();
    for (const [client, alias, role] of [[admin, 'admin', 'admin'], [customer, 'cliente', 'customer']]) {
      const result = await client.write('/auth/login', { email: alias, password: '1234' });
      assert.equal(result.status, 200, `Login ${alias}`); assert.equal(result.body.user.role, role);
      passed(`Cuenta ${alias}/1234 autenticada con rol ${role}`);
    }
    const first = (await customer.call('/products')).body;
    const last = (await customer.call('/products?page=2')).body;
    assert.equal(first.items.length, 9); assert.equal(last.items.length, 2); assert.equal(first.total, 11);
    assert.equal(new Set([...first.items, ...last.items].map(product => product.id)).size, 11);
    passed('Todo: 9+2 productos activos, total11 sin duplicados');
    const events = await customer.call('/events'); assert.equal(events.status, 200); assert.equal(events.body.length, 4);
    passed('Agenda consulta cuatro eventos publicados persistidos');
    assert.equal((await customer.call('/admin/overview')).status, 403);
    assert.equal((await new Client().call('/admin/overview')).status, 401);
    assert.equal((await admin.call('/admin/overview')).status, 200);
    passed('ERP permite administrador y deniega cliente y visitante');
    const original = (await customer.call('/profile')).body.user;
    const csrf = (await customer.call('/csrf')).body.csrfToken;
    const patch = await customer.call('/profile', { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ name: 'Cliente verificado temporalmente' }) });
    assert.equal(patch.status, 200); assert.equal((await customer.call('/profile')).body.user.name, 'Cliente verificado temporalmente');
    assert.equal((await customer.call('/profile', { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ name: original.name }) })).status, 200);
    passed('Perfil se modifica, persiste en nueva consulta y se restaura');
    const marker = 'demo-smoke-' + randomUUID();
    const contact = await customer.write('/contact', { name: 'Demostracion local', email: 'clase@example.invalid', subject: marker, message: 'Prueba funcional local para verificar la recepcion persistida del mensaje.' });
    assert.equal(contact.status, 201);
    assert.ok((await admin.call('/admin/contacts')).body.some(row => row.subject === marker));
    passed('Contacto recibido y visible solo en lectura administrativa');
    const config = (await customer.call('/reservations/config')).body;
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
    const own = (await customer.call('/reservations')).body;
    const available = await customer.call(`/reservations/availability?date=${date}&people=2`);
    assert.equal(available.status, 200);
    const slot = available.body.slots.find(row => row.available && !own.some(reservation => reservation.status === 'confirmed' && reservation.startsAt === row.startsAt));
    assert.ok(slot, 'Debe existir una franja libre para esta prueba local.');
    const key = randomUUID(); const body = { startsAt: slot.startsAt, people: 2 };
    const pair = await Promise.all([customer.write('/reservations', body, { 'Idempotency-Key': key }), customer.write('/reservations', body, { 'Idempotency-Key': key })]);
    for (const result of pair) assert.equal(result.status, 201);
    assert.equal(pair[0].body.id, pair[1].body.id);
    const reservationId = pair[0].body.id;
    passed('Disponibilidad y doble confirmacion idempotente crean una sola reserva');
    assert.ok((await admin.call('/admin/reservations')).body.some(row => row.id === reservationId));
    passed('Reserva cliente aparece en el ERP persistido');
    const cancellation = await Promise.all([customer.write(`/reservations/${reservationId}/cancel`), customer.write(`/reservations/${reservationId}/cancel`)]);
    for (const result of cancellation) { assert.equal(result.status, 200); assert.equal(result.body.status, 'cancelled'); }
    passed('Doble cancelacion consistente deja historial cancelado');
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({ adminCookies: admin.cookies, customerCookies: customer.cookies, reservationId, marker, expectedName: original.name }));
    fs.writeFileSync(evidenceFile, JSON.stringify(checks, null, 2) + '\n');
  } else if (phase === 'resume') {
    const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const admin = new Client(saved.adminCookies); const customer = new Client(saved.customerCookies);
    const profile = await customer.call('/profile'); assert.equal(profile.status, 200); assert.equal(profile.body.user.name, saved.expectedName);
    passed('Sesion y perfil sobreviven al reinicio de API y PostgreSQL');
    const detail = await customer.call(`/reservations/${saved.reservationId}`); assert.equal(detail.status, 200); assert.equal(detail.body.status, 'cancelled');
    passed('Detalle e historial de reserva sobreviven al reinicio');
    const contacts = await admin.call('/admin/contacts'); assert.equal(contacts.status, 200); assert.ok(contacts.body.some(row => row.subject === saved.marker));
    passed('Mensaje de contacto persiste tras reinicio');
    for (const client of [admin, customer]) { assert.equal((await client.write('/auth/logout')).status, 200); assert.equal((await client.call('/auth/me')).status, 401); }
    passed('Logout revoca ambas sesiones en servidor');
    const previous = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
    fs.writeFileSync(evidenceFile, JSON.stringify([...previous, ...checks], null, 2) + '\n');
  } else { throw new Error('Uso: node scripts/verify-demo.cjs prepare|resume'); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
