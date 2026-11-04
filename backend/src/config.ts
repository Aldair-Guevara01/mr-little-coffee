import 'dotenv/config';
import { DateTime, IANAZone } from 'luxon';
import { loadDemoAccountsEnabled } from './demo';

export interface AppConfig {
  production: boolean; demoAccountsEnabled: boolean; port: number; databaseUrl: string; jwtSecret: string; csrfSecret: string;
  origins: string[]; sessionMinutes: number; sameSite: 'lax' | 'strict' | 'none';
  booking: { timezone: string; openingHour: number; closingHour: number; slotMinutes: number; capacity: number; minPeople: number; maxPeople: number; minNoticeMinutes: number; maxAdvanceDays: number };
}
export const CONFIG = Symbol('CONFIG');
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Configuración inválida: ${key}`);
    return value;
  };
  const secret = (key: string) => {
    const value = env[key] ?? '';
    if (value.length < 32 || /REPLACE|CHANGE_ME/i.test(value)) throw new Error(`Define ${key} con al menos 32 caracteres aleatorios.`);
    return value;
  };
  const databaseUrl = env.DATABASE_URL ?? '';
  let db: URL;
  try { db = new URL(databaseUrl); } catch { throw new Error('DATABASE_URL debe ser una URL PostgreSQL válida.'); }
  if (!['postgres:', 'postgresql:'].includes(db.protocol)) throw new Error('DATABASE_URL debe usar PostgreSQL.');
  const origins = (env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(value => value.trim());
  for (const origin of origins) {
    try { if (new URL(origin).origin !== origin || !/^https?:/.test(origin)) throw new Error(); }
    catch { throw new Error('CORS_ORIGINS requiere orígenes HTTP explícitos, sin rutas ni comodines.'); }
  }
  const timezone = env.BUSINESS_TIMEZONE ?? 'America/El_Salvador';
  if (!IANAZone.isValidZone(timezone) || !DateTime.now().setZone(timezone).isValid) throw new Error('BUSINESS_TIMEZONE inválida.');
  const booking = {
    timezone, openingHour: integer('OPENING_HOUR', 7, 0, 23), closingHour: integer('CLOSING_HOUR', 21, 1, 24),
    slotMinutes: integer('SLOT_MINUTES', 60, 15, 240), capacity: integer('SLOT_CAPACITY', 20, 1, 1000),
    minPeople: integer('MIN_PEOPLE', 1, 1, 1000), maxPeople: integer('MAX_PEOPLE', 6, 1, 1000),
    minNoticeMinutes: integer('MIN_NOTICE_MINUTES', 30, 0, 1440), maxAdvanceDays: integer('MAX_ADVANCE_DAYS', 30, 1, 365),
  };
  if (booking.closingHour <= booking.openingHour || ((booking.closingHour - booking.openingHour) * 60) % booking.slotMinutes || booking.maxPeople < booking.minPeople || booking.maxPeople > booking.capacity) throw new Error('Reglas de reserva incompatibles.');
  const sameSite = env.COOKIE_SAME_SITE ?? 'lax';
  if (!['lax', 'strict', 'none'].includes(sameSite)) throw new Error('COOKIE_SAME_SITE inválido.');
  const production = env.NODE_ENV === 'production';
  const demoAccountsEnabled = loadDemoAccountsEnabled(env);
  if (sameSite === 'none' && !production) throw new Error('SameSite=None requiere HTTPS de producción (Secure).');
  const jwtSecret = secret('JWT_SECRET');
  const csrfSecret = secret('CSRF_SECRET');
  if (jwtSecret === csrfSecret) throw new Error('JWT_SECRET y CSRF_SECRET deben ser diferentes.');
  return { production, demoAccountsEnabled, port: integer('PORT', 4000, 1, 65535), databaseUrl, jwtSecret, csrfSecret, origins, sessionMinutes: integer('SESSION_TTL_MINUTES', 120, 1, 1440), sameSite: sameSite as AppConfig['sameSite'], booking };
}
