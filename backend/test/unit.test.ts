import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DateTime } from 'luxon';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { loadConfig } from '../src/config';
import { CatalogQuery, ContactDto } from '../src/catalog';
import { LoginDto, ProfileDto, RegisterDto } from '../src/auth';
import { BookingRules } from '../src/reservations';
import { CsrfService } from '../src/security';

const env = { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'a'.repeat(48), CSRF_SECRET: 'b'.repeat(48) };
const config = loadConfig(env);
const rules = new BookingRules(config.booking);
const now = DateTime.fromISO('2026-11-02T09:00:00-06:00').setZone(config.booking.timezone);

test('configuration validates secrets, origins, cross-site cookie, timezone and provisional rules', () => {
  assert.equal(config.booking.capacity, 20);
  assert.throws(() => loadConfig({ ...env, JWT_SECRET: 'short' }));
  assert.throws(() => loadConfig({ ...env, CORS_ORIGINS: '*' }));
  assert.throws(() => loadConfig({ ...env, BUSINESS_TIMEZONE: 'Invalid' }));
  assert.throws(() => loadConfig({ ...env, COOKIE_SAME_SITE: 'none' }));
  assert.throws(() => loadConfig({ ...env, MAX_PEOPLE: '21' }));
  assert.throws(() => loadConfig({ ...env, OPENING_HOUR: '22' }));
  assert.equal(config.demoAccountsEnabled, false);
  assert.equal(loadConfig({ ...env, NODE_ENV: 'development', DEMO_ACCOUNTS_ENABLED: 'true' }).demoAccountsEnabled, true);
  assert.equal(loadConfig({ ...env, NODE_ENV: 'production', DEMO_ACCOUNTS_ENABLED: 'false' }).demoAccountsEnabled, false);
  assert.throws(() => loadConfig({ ...env, NODE_ENV: 'production', DEMO_ACCOUNTS_ENABLED: 'true' }));
  assert.throws(() => loadConfig({ ...env, DEMO_ACCOUNTS_ENABLED: 'yes' }));
});
test('booking alignment, business timezone, closing, notice and advance boundaries', () => {
  assert.equal(rules.parse('2026-11-02T16:00:00Z').hour, 10);
  assert.equal(rules.isBookable(rules.parse('2026-11-02T10:00:00-06:00'), now), true);
  for (const date of ['2026-11-02T09:00:00-06:00', '2026-11-02T10:30:00-06:00', '2026-11-02T21:00:00-06:00', '2026-11-02T06:00:00-06:00', '2026-11-02T10:00:01-06:00', '2026-12-03T10:00:00-06:00']) assert.equal(rules.isBookable(rules.parse(date), now), false, date);
  assert.equal(rules.isBookable(rules.parse('2026-11-02T20:00:00-06:00'), now), true);
  assert.throws(() => rules.parse('2026-11-02T10:00:00'));
  assert.throws(() => rules.people(7));
  assert.throws(() => rules.people(0));
  assert.throws(() => rules.people(1.5));
});
test('catalog pagination DTO rejects invalid parameters and caps page size', async () => {
  for (const value of [{ page: 0 }, { page: 1.5 }, { pageSize: 51 }, { sort: 'price' }, { category: '../x' }]) assert.ok((await validate(plainToInstance(CatalogQuery, value))).length > 0);
  assert.equal((await validate(plainToInstance(CatalogQuery, { page: '2', pageSize: '9', sort: 'az' }))).length, 0);
});
test('contact DTO normalizes input and rejects short messages', async () => {
  const dto = plainToInstance(ContactDto, { name: ' Ana ', email: ' ANA@example.com ', message: 'Mensaje de prueba válido.' });
  assert.equal(dto.name, 'Ana'); assert.equal(dto.email, 'ana@example.com');
  assert.equal((await validate(dto)).length, 0);
  assert.ok((await validate(plainToInstance(ContactDto, { ...dto, message: 'hola' }))).length > 0);
});
test('password UTF-8 byte cap prevents bcrypt truncation and profile rejects null name', async () => {
  assert.ok((await validate(plainToInstance(RegisterDto, { name: 'Ana', email: 'ana@example.com', password: 'á'.repeat(40) }))).length > 0);
  assert.ok((await validate(plainToInstance(ProfileDto, { name: null }))).length > 0);
  assert.equal((await validate(plainToInstance(ProfileDto, { phone: null }))).length, 0);
  assert.ok((await validate(plainToInstance(RegisterDto, { name: 'Ana', email: 'ana@example.com', password: '1234' }))).length > 0);
  assert.ok((await validate(plainToInstance(RegisterDto, { name: 'Ana', email: 'admin', password: 'password1234' }))).length > 0);
  for (const email of ['admin', 'cliente', ' ANA@example.com ']) assert.equal((await validate(plainToInstance(LoginDto, { email, password: '1234' }))).length, 0);
  assert.ok((await validate(plainToInstance(LoginDto, { email: 'invented-alias', password: '1234' }))).length > 0);
});
test('CSRF rejects forged or malformed signatures', () => {
  const service = new CsrfService(config);
  assert.equal(service.valid(undefined), false);
  assert.equal(service.valid('nonce.123.forged'), false);
  assert.equal(service.valid('malformed'), false);
});
