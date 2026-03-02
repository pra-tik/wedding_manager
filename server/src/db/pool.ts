import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const sslMode = process.env.DB_SSL_MODE;
const rawConnectionString = process.env.DATABASE_URL;

function sanitizeConnectionString(connectionString?: string) {
  if (!connectionString) {
    return connectionString;
  }

  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

const connectionString = sanitizeConnectionString(rawConnectionString);

export const pool = new Pool({
  connectionString,
  ...(sslMode === 'disable'
    ? { ssl: false }
    : sslMode === 'no-verify'
      ? { ssl: { rejectUnauthorized: false } }
      : sslMode === 'verify-full'
        ? {
            ssl: {
              rejectUnauthorized: true,
              ...(process.env.DB_SSL_CA
                ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') }
                : {})
            }
          }
      : {})
});
