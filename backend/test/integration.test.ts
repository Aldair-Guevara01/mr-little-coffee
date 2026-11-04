import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { DateTime } from 'luxon';
import { sign } from 'jsonwebtoken';
import supertest from 'supertest';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { compare, getRounds } from 'bcryptjs';
import { createApplication } from '../src/app';
import { createDataSource } from '../src/database/data-source';
import { seedDatabase } from '../src/database/seed';
import { Product } from '../src/database/entities';
import { DEMO_ACCOUNTS } from '../src/demo';

const testUrl = process.env.TEST_DATABASE_URL;
const origin = 'http://localhost:3000';
const password = 'Test-only-password-723!';
type Client = { agent: ReturnType<typeof supertest.agent>; csrf: string; userId: string; email: string };

test('PostgreSQL + HTTP integration (isolated disposable schema)', { skip: !testUrl, timeout: 300000 }, async t => {
  assert.ok(testUrl);
  const parsed = new URL(testUrl);
  assert.match(decodeURIComponent(parsed.pathname), /test/i, 'TEST_DATABASE_URL must name a test database');
  assert.notEqual(testUrl, process.env.DATABASE_URL, 'Test database must differ from application database');
  const schema = `integration_${randomUUID().replaceAll('-', '')}`;
  const admin = createDataSource(testUrl, 'public');
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const priorEnv = { ...process.env };
  process.env.DATABASE_URL = testUrl;
  process.env.DATABASE_SCHEMA = schema;
  process.env.JWT_SECRET = 'test-jwt-secret-only-'.repeat(4);
  process.env.CSRF_SECRET = 'test-csrf-secret-only-'.repeat(4);
  process.env.CORS_ORIGINS = origin;
  process.env.NODE_ENV = 'test';
  process.env.COOKIE_SAME_SITE = 'lax';
  process.env.DEMO_ACCOUNTS_ENABLED = 'false';
  for (const key of ['BUSINESS_TIMEZONE', 'OPENING_HOUR', 'CLOSING_HOUR', 'SLOT_MINUTES', 'SLOT_CAPACITY', 'MIN_PEOPLE', 'MAX_PEOPLE', 'MIN_NOTICE_MINUTES', 'MAX_ADVANCE_DAYS']) delete process.env[key];
  let app: INestApplication | undefined;
  let db: DataSource | undefined;
  const slot = (day: number, hour: number) => DateTime.now().setZone('America/El_Salvador').startOf('day').plus({ days: day, hours: hour }).toUTC().toISO()!;
  const newClient = async (name: string): Promise<Client> => {
    assert.ok(app);
    const agent = supertest.agent(app.getHttpServer());
    const csrf = (await agent.get('/api/csrf').expect(200)).body.csrfToken as string;
    const email = `${name.toLowerCase()}-${randomUUID()}@example.com`;
    const result = await agent.post('/api/auth/register').set('Origin', origin).set('X-CSRF-Token', csrf).send({ name, email, password }).expect(201);
    assert.equal(result.body.user.role, 'customer');
    assert.equal(result.body.user.passwordHash, undefined);
    assert.match(String(result.headers['set-cookie']), /HttpOnly/);
    return { agent, csrf, userId: result.body.user.id as string, email };
  };
  const write = (client: Client, path: string, body: object = {}, key?: string) => {
    const req = client.agent.post(`/api${path}`).set('Origin', origin).set('X-CSRF-Token', client.csrf);
    if (key) req.set('Idempotency-Key', key);
    return req.send(body);
  };
  try {
    const migrationDb = createDataSource(testUrl, schema);
    await migrationDb.initialize();
    await migrationDb.runMigrations({ transaction: 'all' });
    await seedDatabase(migrationDb);
    await migrationDb.destroy();
    app = await createApplication(true);
    db = app.get<DataSource>(DataSource);
    const database = db;
    const alice = await newClient('Alice');
    const bob = await newClient('Bob');

    await t.test('seed repeats without duplicates or overwriting edited catalog', async () => {
      assert.equal((await database.query('SELECT count(*) FROM users WHERE email = ANY($1)', [Object.values(DEMO_ACCOUNTS).map(account => account.email)]))[0].count, '0');
      const before: { count: string }[] = await database.query('SELECT count(*) FROM products');
      await database.query("UPDATE products SET name = 'Latte editado por usuario' WHERE slug = 'latte-signature'");
      await seedDatabase(database); await seedDatabase(database);
      assert.equal((await database.runMigrations()).length, 0);
      assert.deepEqual(await database.query('SELECT count(*) FROM products'), before);
      const edited = await database.getRepository(Product).findOneByOrFail({ slug: 'latte-signature' });
      assert.equal(edited.name, 'Latte editado por usuario');
      await database.query("UPDATE products SET name = 'Latte Signature' WHERE slug = 'latte-signature'");
      assert.equal((await database.query('SELECT count(*) FROM categories'))[0].count, '6');
      assert.equal((await database.query('SELECT count(*) FROM events'))[0].count, '5');
    });
    await t.test('Todo has 9+2 unique products, exact totals and a finite last page', async () => {
      const first = await alice.agent.get('/api/products?page=1').expect(200);
      const last = await alice.agent.get('/api/products?page=2').expect(200);
      const beyond = await alice.agent.get('/api/products?page=3').expect(200);
      assert.equal(first.body.items.length, 9); assert.equal(last.body.items.length, 2);
      assert.equal(first.body.total, 11); assert.equal(first.body.totalPages, 2);
      assert.equal(beyond.body.items.length, 0);
      const ids = [...first.body.items, ...last.body.items].map((item: { id: string }) => item.id);
      assert.equal(new Set(ids).size, 11);
      const filtered = await alice.agent.get('/api/products?category=cafe-clasico&sort=az').expect(200);
      assert.equal(filtered.body.total, 3);
      assert.equal(filtered.body.items[0].name, 'Cappuccino Italiano');
      const sorted = await alice.agent.get('/api/products?sort=az&pageSize=50').expect(200);
      assert.equal(sorted.body.items[0].name, 'Affogato');
      assert.equal((await alice.agent.get('/api/products?category=novedades').expect(200)).body.total, 2);
      assert.equal((await alice.agent.get('/api/products?category=unknown').expect(200)).body.total, 0);
      for (const query of ['page=0', 'pageSize=51', 'page=1.5', 'sort=price', 'unknown=x']) await alice.agent.get(`/api/products?${query}`).expect(400);
    });
    await t.test('empty catalog, four home details, inactive/missing 404, published ordered events', async () => {
      const ids = new Set<string>();
      for (const slug of ['latte-signature', 'croissant-de-mantequilla', 'cold-brew-special', 'cheesecake-de-frutos-rojos']) {
        const result = await alice.agent.get(`/api/products/${slug}`).expect(200); ids.add(result.body.id as string); assert.equal(result.body.slug, slug);
      }
      assert.equal(ids.size, 4);
      await alice.agent.get('/api/products/mocha-deluxe').expect(404);
      await alice.agent.get('/api/products/unknown').expect(404);
      await database.query('UPDATE products SET active = false');
      try { const empty = await alice.agent.get('/api/products').expect(200); assert.equal(empty.body.total, 0); assert.deepEqual(empty.body.items, []); }
      finally { await database.query("UPDATE products SET active = true WHERE slug <> 'mocha-deluxe'"); }
      const events = await alice.agent.get('/api/events').expect(200);
      assert.equal(events.body.length, 4);
      assert.ok(!events.body.some((event: { title: string }) => event.title === 'Exposición de arte'));
      assert.deepEqual(events.body.map((event: { startsAt: string }) => event.startsAt), [...events.body.map((event: { startsAt: string }) => event.startsAt)].sort());
    });
    await t.test('contact persists; invalid, CSRF, origin and actual database failure never succeed', async () => {
      const message = { name: ' Visitante ', email: ' VISIT@example.com ', message: 'Necesito información sobre horarios.' };
      await write(alice, '/contact', message).expect(201);
      const saved = await database.query('SELECT name,email,message FROM contact_messages');
      assert.deepEqual(saved, [{ name: 'Visitante', email: 'visit@example.com', message: message.message }]);
      await write(alice, '/contact', { ...message, message: 'hola' }).expect(400);
      await alice.agent.post('/api/contact').set('Origin', origin).send(message).expect(403);
      await alice.agent.post('/api/contact').set('Origin', 'https://evil.example').set('X-CSRF-Token', alice.csrf).send(message).expect(403);
      await write(alice, '/contact', { ...message, userId: alice.userId }).expect(400);
      await database.query('ALTER TABLE contact_messages RENAME TO unavailable_contact_messages');
      try { await write(alice, '/contact', message).expect(500); }
      finally { await database.query('ALTER TABLE unavailable_contact_messages RENAME TO contact_messages'); }
      await alice.agent.get('/api/contact').expect(404);
    });
    await t.test('email normalizes and uniqueness holds under concurrent registration', async () => {
      const email = `concurrent-${randomUUID()}@example.com`;
      const payload = { name: 'Concurrent', email: ` ${email.toUpperCase()} `, password };
      const responses = await Promise.all([write(alice, '/auth/register', payload), write(bob, '/auth/register', { ...payload, email })]);
      assert.deepEqual(responses.map(result => result.status).sort(), [201, 409]);
      assert.equal((await database.query('SELECT count(*) FROM users WHERE email=$1', [email]))[0].count, '1');
      // Registration intentionally changes that client's session. Restore their original accounts.
      await write(alice, '/auth/login', { email: alice.email, password }).expect(200);
      await write(bob, '/auth/login', { email: bob.email, password }).expect(200);
      await write(alice, '/auth/register', { name: 'Admin attempt', email: 'bad@example.com', password, role: 'admin' }).expect(400);
    });
    await t.test('login, session reload, private profile, persisted edits and whitelist', async () => {
      await write(alice, '/auth/login', { email: alice.email, password: 'wrong-password' }).expect(401);
      await write(alice, '/auth/login', { email: alice.email.toUpperCase(), password }).expect(200);
      const me = await alice.agent.get('/api/auth/me').expect(200); assert.equal(me.body.user.id, alice.userId);
      assert.match(me.headers['cache-control'], /no-store/);
      await supertest(app!.getHttpServer()).get('/api/profile').expect(401);
      await alice.agent.patch('/api/profile').set('Origin', origin).set('X-CSRF-Token', alice.csrf).send({ name: 'Alice editada', phone: '+503 7000 0000' }).expect(200);
      assert.equal((await alice.agent.get('/api/profile').expect(200)).body.user.phone, '+503 7000 0000');
      await alice.agent.patch('/api/profile').set('Origin', origin).set('X-CSRF-Token', alice.csrf).send({ email: 'other@example.com' }).expect(400);
      await alice.agent.patch('/api/profile').set('Origin', origin).set('X-CSRF-Token', alice.csrf).send({ role: 'admin' }).expect(400);
      await alice.agent.patch('/api/profile').set('Origin', origin).set('X-CSRF-Token', alice.csrf).send({ name: null }).expect(400);
    });
    let reservationId = '';
    const startsAt = slot(1, 10);
    await t.test('availability, valid booking, invalid dates/hours/people and idempotent retries', async () => {
      const day = DateTime.fromISO(startsAt).setZone('America/El_Salvador').toISODate();
      const availability = await supertest(app!.getHttpServer()).get(`/api/reservations/availability?date=${day}&people=2`).expect(200);
      assert.equal(availability.body.slots.length, 14);
      assert.equal(availability.body.slots.at(-1).time, '20:00');
      const key = randomUUID(); const body = { startsAt, people: 2 };
      const [first, retry] = await Promise.all([write(alice, '/reservations', body, key), write(alice, '/reservations', body, key)]);
      assert.equal(first.status, 201); assert.equal(retry.status, 201); assert.equal(first.body.id, retry.body.id);
      reservationId = first.body.id as string;
      await write(alice, '/reservations', { ...body, people: 3 }, key).expect(409);
      await write(alice, '/reservations', body, randomUUID()).expect(409);
      for (const invalid of [{ startsAt: slot(-1, 10), people: 2 }, { startsAt: slot(1, 6), people: 2 }, { startsAt: slot(1, 21), people: 2 }, { startsAt: slot(1, 11), people: 7 }, { startsAt: slot(31, 11), people: 2 }]) await write(alice, '/reservations', invalid, randomUUID()).expect(400);
      await write(alice, '/reservations', body).expect(400);
      await write(alice, '/reservations', { ...body, userId: bob.userId }, randomUUID()).expect(400);
      const rows = await database.query('SELECT booked FROM reservation_slots WHERE starts_at=$1', [startsAt]); assert.equal(rows[0].booked, 2);
    });
    await t.test('ownership, repeat cancellation, released capacity and replay after cancellation', async () => {
      await bob.agent.get(`/api/reservations/${reservationId}`).expect(404);
      await write(bob, `/reservations/${reservationId}/cancel`).expect(404);
      await alice.agent.get(`/api/reservations/${reservationId}`).expect(200);
      const results = await Promise.all([write(alice, `/reservations/${reservationId}/cancel`), write(alice, `/reservations/${reservationId}/cancel`)]);
      for (const result of results) { assert.equal(result.status, 200); assert.equal(result.body.status, 'cancelled'); }
      assert.equal((await database.query('SELECT booked FROM reservation_slots WHERE starts_at=$1', [startsAt]))[0].booked, 0);
      const original = (await database.query('SELECT idempotency_key FROM reservations WHERE id=$1', [reservationId]))[0];
      const replay = await write(alice, '/reservations', { startsAt, people: 2 }, original.idempotency_key as string).expect(201);
      assert.equal(replay.body.id, reservationId); assert.equal(replay.body.status, 'cancelled');
      await write(alice, '/reservations', { startsAt, people: 2 }, randomUUID()).expect(201);
      // A historical fixture can only be inserted directly in this disposable schema.
      // Cancelling through HTTP must preserve its status and occupied capacity.
      const pastStartsAt = slot(-1, 10); const pastId = randomUUID();
      await database.query('INSERT INTO reservation_slots(starts_at,capacity,booked) VALUES ($1,20,2)', [pastStartsAt]);
      await database.query("INSERT INTO reservations(id,user_id,starts_at,people,status,idempotency_key) VALUES ($1,$2,$3,2,'confirmed',$4)", [pastId, alice.userId, pastStartsAt, randomUUID()]);
      await write(alice, `/reservations/${pastId}/cancel`).expect(409);
      assert.equal((await database.query('SELECT booked FROM reservation_slots WHERE starts_at=$1', [pastStartsAt]))[0].booked, 2);
      assert.deepEqual(await database.query('SELECT status,cancelled_at FROM reservations WHERE id=$1', [pastId]), [{ status: 'confirmed', cancelled_at: null }]);
    });
    await t.test('real PostgreSQL concurrent last-capacity competition never exceeds 20', async () => {
      await database.query('DELETE FROM request_limits');
      const charlie = await newClient('Charlie'); const diana = await newClient('Diana'); const eva = await newClient('Eva');
      const crowded = slot(2, 12);
      for (const client of [alice, bob, charlie]) await write(client, '/reservations', { startsAt: crowded, people: 6 }, randomUUID()).expect(201);
      const responses = await Promise.all([write(diana, '/reservations', { startsAt: crowded, people: 2 }, randomUUID()), write(eva, '/reservations', { startsAt: crowded, people: 2 }, randomUUID())]);
      assert.deepEqual(responses.map(result => result.status).sort(), [201, 409]);
      const count = await database.query('SELECT booked, capacity FROM reservation_slots WHERE starts_at=$1', [crowded]);
      assert.equal(count[0].booked, 20); assert.equal(count[0].capacity, 20);
      assert.equal((await database.query("SELECT sum(people)::int AS people FROM reservations WHERE starts_at=$1 AND status='confirmed'", [crowded]))[0].people, 20);
      await assert.rejects(database.query('UPDATE reservation_slots SET booked = 21 WHERE starts_at=$1', [crowded]));
    });
    await t.test('JWT expiry/server session expiry/logout revoke real sessions', async () => {
      const login = await write(bob, '/auth/login', { email: bob.email, password }).expect(200);
      const cookies = login.headers['set-cookie'] as unknown as string[];
      const authCookie = cookies.find(cookie => cookie.startsWith('mlc_session='))!.split(';')[0];
      await write(bob, '/auth/logout').expect(200);
      await bob.agent.get('/api/auth/me').expect(401);
      await supertest(app!.getHttpServer()).get('/api/auth/me').set('Cookie', authCookie).expect(401);
      await write(bob, '/auth/login', { email: bob.email, password }).expect(200);
      const activeSession = (await database.query('SELECT id FROM sessions WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1', [bob.userId]))[0];
      const expiredJwt = sign({ sid: activeSession.id }, process.env.JWT_SECRET!, { subject: bob.userId, issuer: 'mr-little-coffee', audience: 'mr-little-coffee-web', expiresIn: -1, algorithm: 'HS256' });
      await supertest(app!.getHttpServer()).get('/api/auth/me').set('Cookie', `mlc_session=${expiredJwt}`).expect(401);
      await database.query("UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE user_id=$1", [bob.userId]);
      await bob.agent.get('/api/auth/me').expect(401);
      await write(bob, '/auth/login', { email: bob.email, password }).expect(200);
    });
    await t.test('API restart retains profile, session, reservations and contact rows', async () => {
      const login = await write(alice, '/auth/login', { email: alice.email, password }).expect(200);
      const cookies = login.headers['set-cookie'] as unknown as string[];
      const authCookie = cookies.find(cookie => cookie.startsWith('mlc_session='))!.split(';')[0];
      await app!.close();
      app = await createApplication(true); db = app.get<DataSource>(DataSource);
      const profile = await supertest(app.getHttpServer()).get('/api/profile').set('Cookie', authCookie).expect(200);
      assert.equal(profile.body.user.name, 'Alice editada');
      const reservations = await supertest(app.getHttpServer()).get('/api/reservations').set('Cookie', authCookie).expect(200);
      assert.ok(reservations.body.some((row: { id: string }) => row.id === reservationId));
      assert.equal((await db.query('SELECT count(*) FROM contact_messages'))[0].count, '1');
    });
    await t.test('contact abuse is limited after five attempts and CSRF token is stable', async () => {
      await db!.query('DELETE FROM request_limits');
      const guest = supertest.agent(app!.getHttpServer());
      const first = await guest.get('/api/csrf').expect(200); const second = await guest.get('/api/csrf').expect(200);
      assert.equal(first.body.csrfToken, second.body.csrfToken);
      for (let i = 0; i < 5; i++) await guest.post('/api/contact').set('Origin', origin).set('X-CSRF-Token', first.body.csrfToken as string).send({ name: 'Visitor', email: 'visitor@example.com', message: 'Valid persisted message for rate-limit test.' }).expect(201);
      await guest.post('/api/contact').set('Origin', origin).set('X-CSRF-Token', first.body.csrfToken as string).send({ name: 'Visitor', email: 'visitor@example.com', message: 'Must not persist number six.' }).expect(429);
    });
    await t.test('demo seeds are opt-in, bcrypt12, repeatable and never overwrite existing accounts', async () => {
      process.env.DEMO_ACCOUNTS_ENABLED = 'true';
      await seedDatabase(db!);
      const rows = await db!.query('SELECT email,password_hash,role FROM users WHERE email = ANY($1) ORDER BY email', [Object.values(DEMO_ACCOUNTS).map(account => account.email)]) as { email: string; password_hash: string; role: string }[];
      assert.equal(rows.length, 2);
      for (const row of rows) { assert.equal(getRounds(row.password_hash), 12); assert.equal(await compare('1234', row.password_hash), true); }
      assert.equal(rows.find(row => row.email === DEMO_ACCOUNTS.admin.email)?.role, 'admin');
      assert.equal(rows.find(row => row.email === DEMO_ACCOUNTS.cliente.email)?.role, 'customer');
      await db!.query("UPDATE users SET name='Nombre conservado',role='customer' WHERE email=$1", [DEMO_ACCOUNTS.admin.email]);
      const edited = await db!.query('SELECT * FROM users WHERE email = ANY($1) ORDER BY email', [Object.values(DEMO_ACCOUNTS).map(account => account.email)]);
      await seedDatabase(db!); await seedDatabase(db!);
      assert.deepEqual(await db!.query('SELECT * FROM users WHERE email = ANY($1) ORDER BY email', [Object.values(DEMO_ACCOUNTS).map(account => account.email)]), edited);
      await db!.query("UPDATE users SET name=$1,role='admin' WHERE email=$2", [DEMO_ACCOUNTS.admin.name, DEMO_ACCOUNTS.admin.email]);
      await assert.rejects(db!.query("UPDATE users SET role='superadmin' WHERE email=$1", [DEMO_ACCOUNTS.admin.email]));
    });
    await t.test('admin reads persisted data, customers are denied, and public registration cannot grant privilege', async () => {
      await app!.close();
      app = await createApplication(true); db = app.get<DataSource>(DataSource);
      await db.query('DELETE FROM request_limits');
      const demoAdmin = supertest.agent(app.getHttpServer());
      const demoCustomer = supertest.agent(app.getHttpServer());
      const guest = supertest.agent(app.getHttpServer());
      const adminCsrf = (await demoAdmin.get('/api/csrf').expect(200)).body.csrfToken as string;
      const customerCsrf = (await demoCustomer.get('/api/csrf').expect(200)).body.csrfToken as string;
      const guestCsrf = (await guest.get('/api/csrf').expect(200)).body.csrfToken as string;
      const loginAdmin = await demoAdmin.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', adminCsrf).send({ email: ' ADMIN ', password: '1234' }).expect(200);
      assert.equal(loginAdmin.body.user.role, 'admin'); assert.equal(loginAdmin.body.user.email, DEMO_ACCOUNTS.admin.email);
      const loginCustomer = await demoCustomer.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', customerCsrf).send({ email: 'CLIENTE', password: '1234' }).expect(200);
      assert.equal(loginCustomer.body.user.role, 'customer');
      await demoAdmin.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', adminCsrf).send({ email: DEMO_ACCOUNTS.admin.email.toUpperCase(), password: '1234' }).expect(200);
      await demoCustomer.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', customerCsrf).send({ email: 'cliente', password: 'incorrecta' }).expect(401);
      const paths = ['overview', 'products', 'reservations', 'users', 'events', 'contacts'];
      for (const path of paths) {
        await guest.get(`/api/admin/${path}`).expect(401);
        await demoCustomer.get(`/api/admin/${path}`).expect(403);
        const response = await demoAdmin.get(`/api/admin/${path}`).expect(200);
        assert.doesNotMatch(JSON.stringify(response.body), /password|hash|idempotencyKey|revokedAt|expiresAt|jwtSecret|csrfSecret/i);
        assert.match(response.headers['cache-control'], /no-store/);
      }
      const overview = (await demoAdmin.get('/api/admin/overview').expect(200)).body;
      assert.deepEqual(overview.products, { total: 12, active: 11 });
      assert.deepEqual(overview.events, { total: 5, published: 4 });
      const actualUsers = Number((await db.query('SELECT count(*) FROM users'))[0].count);
      assert.equal(overview.users.total, actualUsers); assert.equal(overview.users.admins, 1);
      const actualReservations = Number((await db.query('SELECT count(*) FROM reservations'))[0].count);
      assert.equal(overview.reservations.total, actualReservations);
      assert.equal(overview.reservations.confirmed + overview.reservations.cancelled, actualReservations);
      assert.ok((await demoAdmin.get('/api/admin/products').expect(200)).body.some((row: { slug: string; active: boolean }) => row.slug === 'mocha-deluxe' && !row.active));
      assert.ok((await demoAdmin.get('/api/admin/reservations').expect(200)).body.some((row: { id: string; user: { id: string } }) => row.id === reservationId && row.user.id === alice.userId));
      assert.ok((await demoAdmin.get('/api/admin/events').expect(200)).body.some((row: { published: boolean }) => !row.published));
      const contacts = (await demoAdmin.get('/api/admin/contacts').expect(200)).body;
      assert.equal(contacts.length, overview.contacts.total); assert.ok(contacts.some((row: { email: string }) => row.email === 'visit@example.com'));
      const registration = { name: 'Sin privilegios', email: `public-${randomUUID()}@example.com`, password };
      for (const invalid of [{ ...registration, role: 'admin' }, { ...registration, email: 'admin' }, { ...registration, password: '1234' }, { ...registration, email: DEMO_ACCOUNTS.admin.email }]) await guest.post('/api/auth/register').set('Origin', origin).set('X-CSRF-Token', guestCsrf).send(invalid).expect(400);
      const registered = await guest.post('/api/auth/register').set('Origin', origin).set('X-CSRF-Token', guestCsrf).send(registration).expect(201);
      assert.equal(registered.body.user.role, 'customer');
      await guest.get('/api/admin/overview').expect(403);
      // Authorization comes from the current persisted role, not a JWT claim.
      await db.query("UPDATE users SET role='customer' WHERE email=$1", [DEMO_ACCOUNTS.admin.email]);
      await demoAdmin.get('/api/admin/overview').expect(403);
      await db.query("UPDATE users SET role='admin' WHERE email=$1", [DEMO_ACCOUNTS.admin.email]);
      await demoAdmin.get('/api/admin/overview').expect(200);
      await demoAdmin.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', adminCsrf).send({}).expect(200);
      await demoAdmin.get('/api/admin/overview').expect(401);
    });
    await t.test('disabled demo blocks aliases, reserved emails and existing demo sessions while normal login works', async () => {
      const active = supertest.agent(app!.getHttpServer());
      const csrf = (await active.get('/api/csrf').expect(200)).body.csrfToken as string;
      const login = await active.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', csrf).send({ email: 'admin', password: '1234' }).expect(200);
      const cookies = login.headers['set-cookie'] as unknown as string[];
      const authCookie = cookies.find(cookie => cookie.startsWith('mlc_session='))!.split(';')[0];
      await app!.close();
      process.env.DEMO_ACCOUNTS_ENABLED = 'false';
      app = await createApplication(true); db = app.get<DataSource>(DataSource);
      await db.query('DELETE FROM request_limits');
      const disabled = supertest.agent(app.getHttpServer());
      const disabledCsrf = (await disabled.get('/api/csrf').expect(200)).body.csrfToken as string;
      for (const email of ['admin', 'cliente', DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.cliente.email]) await disabled.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', disabledCsrf).send({ email, password: '1234' }).expect(401);
      await disabled.get('/api/auth/me').set('Cookie', authCookie).expect(401);
      await disabled.get('/api/admin/overview').set('Cookie', authCookie).expect(401);
      await disabled.post('/api/auth/login').set('Origin', origin).set('X-CSRF-Token', disabledCsrf).send({ email: alice.email, password }).expect(200);
      await disabled.get('/api/admin/overview').expect(403);
      const health = await disabled.get('/api/health').expect(200);
      assert.deepEqual(health.body, { status: 'ok', database: 'ok', demoAccountsEnabled: false });
      await seedDatabase(db);
      assert.equal((await db.query('SELECT count(*) FROM users WHERE email = ANY($1)', [Object.values(DEMO_ACCOUNTS).map(account => account.email)]))[0].count, '2');
    });
  } finally {
    if (app) await app.close();
    // This schema was created by this test run after verifying the test database name.
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.destroy();
    for (const key of Object.keys(process.env)) if (!(key in priorEnv)) delete process.env[key];
    Object.assign(process.env, priorEnv);
  }
});
