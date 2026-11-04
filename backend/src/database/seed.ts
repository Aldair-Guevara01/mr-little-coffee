import { DataSource } from 'typeorm';
import { hash } from 'bcryptjs';
import { Category, CoffeeEvent, Product, User } from './entities';
import { createDataSource } from './data-source';
import { DEMO_ACCOUNTS, loadDemoAccountsEnabled } from '../demo';

// Copied from the preexisting catalog; image keys refer to its CSS/symbol art.
// No verified prices were present, so priceCents remains null.
const catalog = [
  ['latte-signature', 'Latte Signature', 'cafe-de-especialidad', 'Suave espresso, leche sedosa y nuestro toque de cacao.', 'latte', 'Especialidad', true, true],
  ['croissant-de-mantequilla', 'Croissant de mantequilla', 'panaderia', 'Hojaldrado artesanal, crujiente y delicadamente dorado.', 'croissant', 'Nuevo', true, true],
  ['cold-brew-special', 'Cold Brew Special', 'bebidas-frias', 'Infusión lenta, notas de chocolate y frescura intensa.', 'cold', 'Especialidad', true, true],
  ['cheesecake-de-frutos-rojos', 'Cheesecake de frutos rojos', 'postres', 'Cremoso, delicado y terminado con frutos del bosque.', 'cake', 'Recomendado', true, true],
  ['espresso-signature', 'Espresso Signature', 'cafe-clasico', 'Intenso y aromático, nuestro café en su forma más pura.', 'espresso', null, true, false],
  ['cappuccino-italiano', 'Cappuccino Italiano', 'cafe-clasico', 'Espuma perfecta y balance delicado.', 'cappuccino', 'Especialidad', true, true],
  ['flat-white', 'Flat White', 'cafe-clasico', 'Cuerpo sedoso y dulzor natural.', 'flat', null, true, false],
  ['mocha-deluxe', 'Mocha Deluxe', 'cafe-de-especialidad', 'Chocolate belga y espresso de origen.', 'mocha', null, false, false],
  ['affogato', 'Affogato', 'cafe-de-especialidad', 'Helado de vainilla bañado en espresso.', 'affogato', null, true, false],
  ['croissant-de-almendras', 'Croissant de almendras', 'pasteleria', 'Crujiente, tostado y suavemente dulce.', 'almond', null, true, false],
  ['pan-de-masa-madre', 'Pan de masa madre', 'panaderia', 'Fermentación lenta y corteza artesanal.', 'bread', null, true, false],
  ['tarta-de-chocolate', 'Tarta de chocolate', 'postres', 'Cacao profundo y textura aterciopelada.', 'chocolate', 'Nuevo', true, false],
] as const;
const categories = [
  ['cafe-de-especialidad', 'Café de especialidad'], ['cafe-clasico', 'Café clásico'], ['panaderia', 'Panadería'], ['bebidas-frias', 'Bebidas frías'], ['postres', 'Postres'], ['pasteleria', 'Pastelería'],
] as const;
// Original page supplied day/month/time without year. 2026 is DEMO DATA, not a verified agenda.
// Exhibition was already marked as draft in the preexisting admin mock.
const events = [
  ['jazz-2026', 'Noche de jazz', 'Cuarteto en vivo y una carta especial de bebidas de autor.', '2026-08-08T19:30:00-06:00', true],
  ['cata-2026', 'Cata de café', 'Tres orígenes, tres historias y una degustación guiada.', '2026-08-15T17:00:00-06:00', true],
  ['barismo-2026', 'Taller de barismo', 'Una introducción práctica al espresso perfecto.', '2026-08-22T10:00:00-06:00', true],
  ['arte-2026', 'Exposición de arte', 'Talento local en una velada de inauguración íntima.', '2026-08-29T18:00:00-06:00', false],
  ['acustica-2026', 'Sesión acústica', 'Canciones cercanas para terminar la semana con calma.', '2026-09-05T19:00:00-06:00', true],
] as const;
export async function seedDatabase(db: DataSource) {
  const demoEnabled = loadDemoAccountsEnabled();
  await db.transaction(async manager => {
    for (const [slug, name] of categories) await manager.createQueryBuilder().insert().into(Category).values({ slug, name }).orIgnore().execute();
    const categoryMap = new Map((await manager.getRepository(Category).find()).map(category => [category.slug, category.id]));
    for (const [index, [slug, name, category, description, image, label, active, featured]] of catalog.entries()) {
      await manager.createQueryBuilder().insert().into(Product).values({ slug, name, categoryId: categoryMap.get(category)!, description, image, label, active, featured, priceCents: null, displayOrder: index + 1 }).orIgnore().execute();
    }
    for (const [seedKey, title, description, date, published] of events) await manager.createQueryBuilder().insert().into(CoffeeEvent).values({ seedKey, title, description, startsAt: new Date(date), published, image: null }).orIgnore().execute();
    if (demoEnabled) {
      for (const account of Object.values(DEMO_ACCOUNTS)) {
        if (await manager.getRepository(User).existsBy({ email: account.email })) continue;
        // The short password is an explicit classroom-only exception to public registration.
        const passwordHash = await hash('1234', 12);
        await manager.createQueryBuilder().insert().into(User).values({ ...account, passwordHash, phone: null }).orIgnore().execute();
      }
    }
  });
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Define DATABASE_URL en backend/.env.');
  const db = createDataSource(process.env.DATABASE_URL);
  await db.initialize();
  try { await seedDatabase(db); console.log('Seed aplicado: solo filas faltantes; no se borran ni sobrescriben datos.'); }
  finally { await db.destroy(); }
}
if (require.main === module) main().catch(error => { console.error(error instanceof Error ? error.message : 'Falló el seed.'); process.exitCode = 1; });
