const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WA7cM2SDQoiz@ep-delicate-lab-alftggoj.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    console.log('Connecting to Neon...');
    const client = await pool.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('./database/003_xsd_migration.sql', 'utf8');
    
    try {
        await client.query(sql);
        console.log('Migration executed successfully!');
    } catch (e) {
        console.log('Error: ' + e.message);
    }

    const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('\nTables in database: ' + rows.length);
    rows.forEach(r => console.log('  ' + r.tablename));

    client.release();
    pool.end();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
