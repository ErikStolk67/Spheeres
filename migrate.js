const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WA7cM2SDQoiz@ep-delicate-lab-alftggoj.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    console.log('Connecting to Neon...');
    const client = await pool.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('./database/003_xsd_migration.sql', 'utf8');
    const lines = sql.split('\n');
    let currentStmt = '';
    let ok = 0, fail = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('--') || trimmed === '') continue;
        currentStmt += ' ' + trimmed;

        if (trimmed.endsWith(';')) {
            const stmt = currentStmt.trim().replace(/;$/, '');
            if (stmt.length > 5) {
                try {
                    await client.query(stmt);
                    ok++;
                    if (stmt.toUpperCase().includes('CREATE TABLE')) {
                        const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                        if (match) console.log('  Created: ' + match[1]);
                    }
                } catch (e) {
                    console.log('  SKIP: ' + e.message.substring(0, 80));
                    fail++;
                }
            }
            currentStmt = '';
        }
    }

    const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('\n=== RESULT ===');
    console.log('Statements OK: ' + ok + ', Skipped: ' + fail);
    console.log('Tables in database: ' + rows.length);
    rows.forEach(r => console.log('  ' + r.tablename));

    client.release();
    pool.end();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
