import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../auth.js';
import { createUser, getUserByUsername } from './repositories.js';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadMigrationSql() {
  const candidates = [
    path.resolve(__dirname, '../migrations/init.sql'),
    path.resolve(__dirname, '../../src/migrations/init.sql'),
    path.resolve(process.cwd(), 'server/src/migrations/init.sql')
  ];

  for (const migrationPath of candidates) {
    try {
      await fs.access(migrationPath);
      return await fs.readFile(migrationPath, 'utf-8');
    } catch {
      // try next path
    }
  }

  throw new Error(`Migration file not found. Tried: ${candidates.join(', ')}`);
}

export async function initializeDatabase() {
  if (process.env.DB_SKIP_MIGRATIONS === 'true') {
    return;
  }

  const migrationSql = await loadMigrationSql();
  await pool.query(migrationSql);

  const existingAdmin = await getUserByUsername('admin');
  if (!existingAdmin) {
    await createUser({
      username: 'admin',
      passwordHash: hashPassword('password'),
      isAdmin: true,
      permissions: {
        guests: 'edit',
        analytics: 'edit',
        timeline: 'edit',
        todos: 'edit',
        imports: 'edit',
        users: 'edit',
        stays: 'edit'
      }
    });
  }
}