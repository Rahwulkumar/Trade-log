/**
 * Drizzle DB client — SERVER ONLY
 * Do NOT import this in client components or pages marked "use client".
 * Client components must fetch data via API routes (/api/...).
 */
import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export const dbClient = sql;
