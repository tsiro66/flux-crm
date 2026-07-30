// One-off: apply a supabase/migrations/*.sql file to DATABASE_URL.
// Usage: node scripts/apply-migration.mjs supabase/migrations/0003_recurring_payments.sql
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node scripts/apply-migration.mjs <sql-file>');
	process.exit(1);
}

// Minimal .env loader (no dotenv dependency needed at runtime)
for (const line of readFileSync('.env', 'utf8').split('\n')) {
	const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL not set in .env');
	process.exit(1);
}

// prepare:false -> simple query protocol, supports multiple statements per file
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const statements = readFileSync(file, 'utf8');
await sql.unsafe(statements);

const [table] = await sql`
	select tablename from pg_tables
	where schemaname = 'public' and tablename = 'recurring_payments'
`;
const [rls] = await sql`
	select relrowsecurity from pg_class where relname = 'recurring_payments'
`;
const policies = await sql`
	select policyname from pg_policies where tablename = 'recurring_payments'
`;

console.log('table exists:', !!table);
console.log('RLS enabled:', rls?.relrowsecurity);
console.log('policies:', policies.map((p) => p.policyname).join(', '));

await sql.end();
