import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRole1730000001000 implements MigrationInterface {
  name = 'AdminRole1730000001000';
  async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE users DROP CONSTRAINT users_role_check, ADD CONSTRAINT users_role_check CHECK(role IN ('customer', 'admin'))");
  }
  async down(q: QueryRunner): Promise<void> {
    // Fail safely if admin rows still exist; never demote or delete accounts during rollback.
    await q.query("ALTER TABLE users DROP CONSTRAINT users_role_check, ADD CONSTRAINT users_role_check CHECK(role = 'customer')");
  }
}
