// Reserved identities for classroom demonstrations; never use for real customers.
export const DEMO_ACCOUNTS = {
  admin: { name: 'Administrador demo', email: 'admin@demo.mrlittlecoffee.invalid', role: 'admin' },
  cliente: { name: 'Cliente demo', email: 'cliente@demo.mrlittlecoffee.invalid', role: 'customer' },
} as const;

export function demoAccount(alias: string) {
  return Object.hasOwn(DEMO_ACCOUNTS, alias) ? DEMO_ACCOUNTS[alias as keyof typeof DEMO_ACCOUNTS] : undefined;
}

export function isDemoEmail(email: string) {
  return Object.values(DEMO_ACCOUNTS).some(account => account.email === email);
}

export function loadDemoAccountsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.DEMO_ACCOUNTS_ENABLED ?? 'false';
  if (value !== 'true' && value !== 'false') throw new Error('DEMO_ACCOUNTS_ENABLED debe ser true o false.');
  if (value === 'true' && env.NODE_ENV === 'production') throw new Error('Las cuentas demo no se permiten en producción.');
  return value === 'true';
}
