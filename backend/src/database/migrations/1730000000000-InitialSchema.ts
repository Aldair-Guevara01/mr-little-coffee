import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(80) NOT NULL UNIQUE, name varchar(100) NOT NULL);
      CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug varchar(120) NOT NULL UNIQUE, name varchar(150) NOT NULL, description text NOT NULL, image varchar(300) NOT NULL, category_id uuid NOT NULL REFERENCES categories(id), label varchar(80), featured boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, price_cents integer CHECK(price_cents >= 0), display_order integer NOT NULL DEFAULT 0);
      CREATE INDEX products_catalog_idx ON products(active, category_id, featured, display_order, id);
      CREATE TABLE events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seed_key varchar(100) UNIQUE, title varchar(150) NOT NULL, description text NOT NULL, starts_at timestamptz NOT NULL, image varchar(300), published boolean NOT NULL DEFAULT false);
      CREATE INDEX events_published_date_idx ON events(published, starts_at, id);
      CREATE TABLE contact_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL, email varchar(254) NOT NULL, subject varchar(150), message text NOT NULL CHECK(length(message) BETWEEN 10 AND 3000), created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL, email varchar(254) NOT NULL UNIQUE CHECK(email = lower(btrim(email))), password_hash varchar(100) NOT NULL, phone varchar(25), role varchar(20) NOT NULL DEFAULT 'customer' CHECK(role = 'customer'), created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX sessions_user_idx ON sessions(user_id);
      CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
      CREATE TABLE reservation_slots (starts_at timestamptz PRIMARY KEY, capacity integer NOT NULL CHECK(capacity > 0), booked integer NOT NULL DEFAULT 0 CHECK(booked >= 0 AND booked <= capacity));
      CREATE TABLE reservations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), starts_at timestamptz NOT NULL REFERENCES reservation_slots(starts_at), people integer NOT NULL CHECK(people > 0), status varchar(20) NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')), idempotency_key uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz, CONSTRAINT reservation_status_check CHECK((status = 'confirmed' AND cancelled_at IS NULL) OR (status = 'cancelled' AND cancelled_at IS NOT NULL)), UNIQUE(user_id, idempotency_key));
      CREATE UNIQUE INDEX reservations_active_user_slot_idx ON reservations(user_id, starts_at) WHERE status = 'confirmed';
      CREATE INDEX reservations_user_date_idx ON reservations(user_id, starts_at DESC);
      CREATE INDEX reservations_slot_status_idx ON reservations(starts_at, status);
      CREATE TABLE request_limits (key varchar(100) PRIMARY KEY, count integer NOT NULL CHECK(count > 0), resets_at timestamptz NOT NULL);
      CREATE INDEX request_limits_expiry_idx ON request_limits(resets_at);
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE request_limits, reservations, reservation_slots, sessions, users, contact_messages, events, products, categories');
  }
}
