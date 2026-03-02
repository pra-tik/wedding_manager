import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../auth.js';
import { createUser, getUserByUsername } from './repositories.js';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  const migrationPath = path.resolve(__dirname, '../migrations/init.sql');
  const migrationSql = await fs.readFile(migrationPath, 'utf-8');
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
