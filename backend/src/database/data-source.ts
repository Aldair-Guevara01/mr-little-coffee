import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from './entities';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';
import { AdminRole1730000001000 } from './migrations/1730000001000-AdminRole';

export function createDataSource(url: string, schema = process.env.DATABASE_SCHEMA): DataSource {
  if (schema && !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('DATABASE_SCHEMA inválido.');
  return new DataSource({ type: 'postgres', url, schema, entities, migrations: [InitialSchema1730000000000, AdminRole1730000001000], synchronize: false, logging: false, extra: { max: 12, connectionTimeoutMillis: 5000, ...(schema ? { options: `-c search_path=${schema},public` } : {}) } });
}
