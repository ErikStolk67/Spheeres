const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

// Use Railway DATABASE_URL or fallback to local
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:metalspheres@localhost:5432/metalspheres',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ============================================================================
// DICTIONARY ENDPOINTS
// ============================================================================

app.get('/api/dictionaries', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_dictionaries ORDER BY name');
    res.json(rows);
});

// Cache for schema - refreshed every 5 min or on demand
let schemaCache = null;
let schemaCacheTime = 0;
const SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSchemaFull() {
    if (schemaCache && Date.now() - schemaCacheTime < SCHEMA_CACHE_TTL) return schemaCache;
    
    // Get columns
    const { rows } = await pool.query(`
        SELECT t.table_name, c.column_name, c.data_type, c.character_maximum_length,
               c.is_nullable, c.column_default,
               CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_pk
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
        LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ) pk ON pk.table_name = t.table_name AND pk.column_name = c.column_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
    `);
    
    const tables = {};
    for (const r of rows) {
        if (!tables[r.table_name]) tables[r.table_name] = { columns: [], count: 0 };
        tables[r.table_name].columns.push({
            name: r.column_name, type: r.data_type,
            maxLen: r.character_maximum_length,
            nullable: r.is_nullable === 'YES', pk: r.is_pk
        });
    }
    
    // Get counts in batches
    const names = Object.keys(tables);
    for (let i = 0; i < names.length; i += 20) {
        const batch = names.slice(i, i + 20)
            .map(t => `SELECT '${t}' as t, count(*) as c FROM "${t}"`)
            .join(' UNION ALL ');
        const { rows: countRows } = await pool.query(batch);
        for (const r of countRows) {
            if (tables[r.t]) tables[r.t].count = parseInt(r.c);
        }
    }
    
    schemaCache = tables;
    schemaCacheTime = Date.now();
    return tables;
}

// Single endpoint: schema + counts in one call
app.get('/api/schema/full', async (req, res) => {
    try {
        res.json(await getSchemaFull());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Invalidate cache after import/clear/migrate
function invalidateSchemaCache() { schemaCache = null; schemaCacheTime = 0; }

// Keep backward compat
app.get('/api/schema/all', async (req, res) => {
    try {
        const full = await getSchemaFull();
        const result = {};
        for (const [t, v] of Object.entries(full)) result[t] = v.columns;
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/schema/counts', async (req, res) => {
    try {
        const full = await getSchemaFull();
        const result = {};
        for (const [t, v] of Object.entries(full)) result[t] = v.count;
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Keep-alive: ping every 4 minutes to prevent Render sleep
setInterval(() => {
    pool.query('SELECT 1').catch(() => {});
}, 4 * 60 * 1000);

app.get('/api/databases', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_databases ORDER BY name');
    res.json(rows);
});

app.get('/api/tables', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_tables ORDER BY sort');
    res.json(rows);
});

// Update sort_order for multiple tables at once (after drag & drop reorder)
app.put('/api/tables/sort', express.json(), async (req, res) => {
    const { order } = req.body; // array of { name, sort }
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const item of order) {
                await client.query(
                    'UPDATE cd_tables SET sort = $1, changedate = now() WHERE UPPER(name) = UPPER($2)',
                    [item.sort, item.name]
                );
            }
            await client.query('COMMIT');
            res.json({ ok: true, updated: order.length });
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Initialize NULL sort values — fills gaps with sequential numbers
app.post('/api/tables/sort/init', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // Get all tables ordered by: existing sort first (numeric), then name
            const { rows } = await client.query(
                "SELECT k_table, name, sort FROM cd_tables ORDER BY CASE WHEN sort IS NULL OR sort = '' THEN 1 ELSE 0 END, CAST(NULLIF(sort, '') AS INTEGER) NULLS LAST, name"
            );
            await client.query('BEGIN');
            let changed = 0;
            for (let i = 0; i < rows.length; i++) {
                const newSort = String(i + 1);
                if (rows[i].sort !== newSort) {
                    await client.query('UPDATE cd_tables SET sort = $1 WHERE k_table = $2', [newSort, rows[i].k_table]);
                    changed++;
                }
            }
            await client.query('COMMIT');
            res.json({ ok: true, total: rows.length, changed });
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/tables/:id/fields', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM cd_fields WHERE k_table = $1 ORDER BY sort', [req.params.id]
    );
    res.json(rows);
});

app.get('/api/fields', async (req, res) => {
    const { rows } = await pool.query(`
        SELECT f.*, t.name as table_name, t.table_type::text
        FROM cd_fields f JOIN cd_tables t ON f.k_table = t.k_table
        ORDER BY t.sort, f.sort
    `);
    res.json(rows);
});

app.post('/api/tables/:id/fields', async (req, res) => {
    const { name, data_type, max_length, is_required, control_type, lookup_table } = req.body;
    const k_table = req.params.id;
    try {
        const sortRes = await pool.query(
            "SELECT COALESCE(MAX(sort), 499) + 1 as next_sort FROM cd_fields WHERE k_table = $1 AND field_group = 'C'",
            [k_table]
        );
        const { rows } = await pool.query(`
            INSERT INTO cd_fields (k_field, k_table, name, alias, field_group, data_type,
                max_length, is_required, is_system, is_primary_key, is_foreign_key, fk_table, sort)
            VALUES (gen_random_uuid(), $1, $2, $2, 'C', $3, $4, $5, false, false, $6, $7, $8)
            RETURNING *
        `, [k_table, name, data_type, max_length || null, is_required || false,
            control_type === 'lookup', lookup_table || null, sortRes.rows[0].next_sort]);

        const field = rows[0];
        await pool.query(`
            INSERT INTO cd_controls (k_control, k_field, control_type, label, is_visible, is_readonly, is_required, lookup_table, sort)
            VALUES (gen_random_uuid(), $1, $2, $3, true, false, $4, $5, $6)
        `, [field.k_field, control_type, name, is_required || false, lookup_table || null, field.sort_order]);

        res.json(field);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fields/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM cd_controls WHERE k_field = $1', [req.params.id]);
        await pool.query('DELETE FROM cd_fields WHERE k_field = $1 AND is_system = false', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/roles', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_roles ORDER BY name');
    res.json(rows);
});

app.get('/api/lifestatuses', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_lifestatuses ORDER BY sort_order');
    res.json(rows);
});

app.get('/api/folders', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_folders ORDER BY sort_order');
    res.json(rows);
});

app.get('/api/controls', async (req, res) => {
    const { rows } = await pool.query(`
        SELECT c.*, f.name as field_name, t.name as table_name
        FROM cd_controls c JOIN cd_fields f ON c.k_field = f.k_field
        JOIN cd_tables t ON f.k_table = t.k_table ORDER BY c.sort_order
    `);
    res.json(rows);
});

// ============================================================================
// TYPES ENDPOINTS
// ============================================================================

app.get('/api/tables/:id/types', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM cd_types WHERE k_table = $1 ORDER BY sort_order, name', [req.params.id]
    );
    res.json(rows);
});

// Bulk type counts per table (for designer Type column)
// Counts DISTINCT f_type values in the actual data of each table
app.get('/api/types/counts', async (req, res) => {
    try {
        // Get all table names from cd_tables
        const { rows: tables } = await pool.query('SELECT name FROM cd_tables');
        const counts = {};
        
        for (const t of tables) {
            const tName = t.name.toLowerCase();
            try {
                // Check if table exists and has f_type column
                const colCheck = await pool.query(
                    "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='f_type'",
                    [tName]
                );
                if (colCheck.rows.length > 0) {
                    const result = await pool.query(`SELECT COUNT(DISTINCT f_type) as cnt FROM "${tName}" WHERE f_type IS NOT NULL`);
                    counts[t.name.toUpperCase()] = parseInt(result.rows[0].cnt) || 0;
                }
            } catch(e) {
                // Table might not exist yet, skip
            }
        }
        res.json(counts);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/tables/:id/types', async (req, res) => {
    const { name } = req.body;
    try {
        const sortRes = await pool.query(
            'SELECT COALESCE(MAX(sort), 0) + 1 as next FROM cd_types WHERE k_table = $1', [req.params.id]
        );
        const { rows } = await pool.query(`
            INSERT INTO cd_types (k_type, k_table, name, alias, sort)
            VALUES (gen_random_uuid(), $1, $2, $2, $3)
            RETURNING *
        `, [req.params.id, name || 'New Type', sortRes.rows[0].next]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/types/:id', async (req, res) => {
    const { name, memo, flow_folder, kind, icon } = req.body;
    try {
        const { rows } = await pool.query(`
            UPDATE cd_types SET name=$2, memo=$3, flow_folder=$4, kind=$5, icon=$6, changedate=NOW()
            WHERE k_type=$1 RETURNING *
        `, [req.params.id, name, memo || null, flow_folder || false, kind || null, icon || null]);
        res.json(rows[0] || { error: 'Not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/types/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM cd_type_type WHERE k_type_parent=$1 OR k_type_child=$1', [req.params.id]);
        await pool.query('DELETE FROM cd_types WHERE k_type = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

app.get('/api/stats/counts', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT schemaname, relname as table_name, n_live_tup as count
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY relname
        `);
        const counts = {};
        rows.forEach(r => { counts[r.table_name] = parseInt(r.count); });
        res.json(counts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/raw/:table', async (req, res) => {
    const table = req.params.table.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    try {
        // Get total count
        const countRes = await pool.query(`SELECT count(*) FROM "${table}"`);
        const total = parseInt(countRes.rows[0].count);
        
        // Get rows with optional search on name column
        let query = `SELECT * FROM "${table}"`;
        const params = [];
        if (search) {
            query += ` WHERE name ILIKE $1`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`;
        
        const { rows } = await pool.query(query, params);
        res.json({ rows, total, limit, offset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// MIGRATE ENDPOINT - Execute SQL remotely
// ============================================================================

app.post('/api/migrate', async (req, res) => {
    const { sql, key } = req.body;
    if (key !== 'ms2026!') return res.status(403).json({ error: 'Invalid key' });
    if (!sql) return res.status(400).json({ error: 'No SQL provided' });
    try {
        const result = await pool.query(sql);
        invalidateSchemaCache();
        res.json({ success: true, rowCount: result.rowCount, rows: result.rows?.slice(0, 100) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// SCHEMA MANAGEMENT - Tables & Fields CRUD
// ============================================================================

// Get all tables with their columns from information_schema
app.get('/api/schema/tables', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT table_name, 
                   (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
            FROM information_schema.tables t 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get columns for a specific table
app.get('/api/schema/tables/:name/columns', async (req, res) => {
    const table = req.params.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    try {
        const { rows } = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default,
                   ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [table]);
        
        // Also get primary key info
        const pk = await pool.query(`
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        `, [table]);
        const pkCols = pk.rows.map(r => r.column_name);
        
        rows.forEach(r => { r.is_primary_key = pkCols.includes(r.column_name); });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new table
app.post('/api/schema/tables', async (req, res) => {
    const { name, columns } = req.body;
    if (!name) return res.status(400).json({ error: 'Table name required' });
    
    const tableName = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    // Default columns if none provided
    const cols = columns || [
        { name: 'k_' + tableName.replace(/^cd_/, ''), type: 'SERIAL', pk: true },
        { name: 'name', type: 'varchar(100)' },
        { name: 'createdby', type: 'integer' },
        { name: 'createdate', type: 'timestamptz', default: 'now()' },
        { name: 'changedby', type: 'integer' },
        { name: 'changedate', type: 'timestamptz', default: 'now()' }
    ];
    
    const colDefs = cols.map(c => {
        let def = `${c.name} ${c.type}`;
        if (c.pk) def += ' PRIMARY KEY';
        if (c.notnull) def += ' NOT NULL';
        if (c.default) def += ` DEFAULT ${c.default}`;
        return def;
    }).join(', ');
    
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs})`);
        res.json({ success: true, table: tableName, columns: cols.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add column to existing table
app.post('/api/schema/tables/:name/columns', async (req, res) => {
    const table = req.params.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const { column_name, data_type, default_value } = req.body;
    if (!column_name || !data_type) return res.status(400).json({ error: 'column_name and data_type required' });
    
    const colName = column_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colName} ${data_type}`;
    if (default_value) sql += ` DEFAULT ${default_value}`;
    
    try {
        await pool.query(sql);
        res.json({ success: true, table, column: colName, type: data_type });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Drop column from table
app.delete('/api/schema/tables/:name/columns/:col', async (req, res) => {
    const table = req.params.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const col = req.params.col.toLowerCase().replace(/[^a-z0-9_]/g, '');
    try {
        await pool.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${col}`);
        res.json({ success: true, table, dropped: col });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Drop table
app.delete('/api/schema/tables/:name', async (req, res) => {
    const table = req.params.name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    try {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
        res.json({ success: true, dropped: table });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Insert data into table
app.post('/api/data/:table', async (req, res) => {
    const table = req.params.table.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ error: 'No data provided' });
    
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    
    try {
        const { rows } = await pool.query(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            vals
        );
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// REBUILD DATABASE - Recreate all tables from migration SQL
app.post('/api/rebuild-db', async (req, res) => {
    const client = await pool.connect();
    try {
        const migrationSql = fs.readFileSync(path.join(__dirname, 'database', '003_xsd_migration.sql'), 'utf-8');
        await client.query(migrationSql);
        
        // Also run alignment if exists
        try {
            const alignSql = fs.readFileSync(path.join(__dirname, 'database', '004_xsd_alignment.sql'), 'utf-8');
            await client.query(alignSql);
        } catch(e) {}
        
        // Count tables
        const { rows } = await client.query(`
            SELECT count(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        
        res.json({ success: true, tables: parseInt(rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/clear-all', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        for (const r of rows) {
            await client.query(`TRUNCATE TABLE ${r.table_name} CASCADE`);
        }
        invalidateSchemaCache();
        res.json({ success: true, tables_cleared: rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// CLEAR DICTIONARY - Empty all CD_ tables
// ============================================================================

app.post('/api/clear-dictionary', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Get all cd_ tables
        const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'cd_%'
            ORDER BY table_name
        `);
        
        // Disable triggers, truncate all, re-enable
        for (const r of rows) {
            await client.query(`TRUNCATE TABLE ${r.table_name} CASCADE`);
        }
        
        await client.query('COMMIT');
        invalidateSchemaCache();
        res.json({ success: true, tables_cleared: rows.length });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// SEED XSD - Import parsed XSD metadata into dictionary tables
// ============================================================================

app.post('/api/seed-xsd', async (req, res) => {
    const { tables: seedTables } = req.body;
    if (!seedTables) return res.status(400).json({ error: 'No tables provided' });
    
    const client = await pool.connect();
    try {
        // Step 1: Drop constraints OUTSIDE transaction (DDL)
        const constraints = await client.query(`
            SELECT tc.constraint_name, tc.table_name 
            FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'public' 
            AND tc.table_name IN ('cd_tables','cd_fields','cd_tabl_fiel')
            AND tc.constraint_type = 'PRIMARY KEY'
        `);
        for (const c of constraints.rows) {
            await client.query(`ALTER TABLE ${c.table_name} DROP CONSTRAINT IF EXISTS "${c.constraint_name}"`);
        }
        
        // Step 2: Truncate
        await client.query('TRUNCATE cd_tabl_fiel');
        await client.query('TRUNCATE cd_fields');
        await client.query('TRUNCATE cd_tables');
        
        // Step 3: Insert in transaction
        await client.query('BEGIN');
        
        let tableId = 1;
        let fieldId = 1;
        let linkCount = 0;
        const results = { lookups: 0, entities: 0, subtables: 0, links: 0 };
        const typeNames = { 1: 'entities', 2: 'lookups', 3: 'links', 4: 'subtables' };
        
        for (const [tableName, info] of Object.entries(seedTables)) {
            const fType = info.fType || 1;
            
            // Insert into cd_tables
            await client.query(
                'INSERT INTO cd_tables (k_table, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                [tableId, tableName, fType, tableId]
            );
            results[typeNames[fType] || 'entities']++;
            
            // Insert fields and table-field links
            let fieldSort = 1;
            for (const field of info.fields) {
                let fFieldType = 2;
                if (field.xsType === 'int') fFieldType = 1;
                else if (field.xsType === 'boolean') fFieldType = 3;
                else if (field.xsType === 'dateTime') fFieldType = 4;
                else if (field.xsType === 'base64Binary') fFieldType = 5;
                if (field.name === 'REPLICATIONID') fFieldType = 6;
                
                const isPk = field.name.startsWith('K_') && fieldSort <= 3;
                
                // Insert into cd_fields
                await client.query(
                    'INSERT INTO cd_fields (k_field, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                    [fieldId, field.name, fFieldType, fieldSort]
                );
                
                // Insert into cd_tabl_fiel
                await client.query(
                    'INSERT INTO cd_tabl_fiel (k_fiel, k_tabl, k_seq, main, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                    [fieldId, tableId, fieldSort, isPk]
                );
                
                fieldId++;
                linkCount++;
                fieldSort++;
            }
            tableId++;
        }
        
        await client.query('COMMIT');
        
        // Step 4: Verify counts
        const tCount = await client.query('SELECT count(*) FROM cd_tables');
        const fCount = await client.query('SELECT count(*) FROM cd_fields');
        const lCount = await client.query('SELECT count(*) FROM cd_tabl_fiel');
        
        await client.query('ANALYZE cd_tables');
        await client.query('ANALYZE cd_fields');
        await client.query('ANALYZE cd_tabl_fiel');
        
        res.json({
            success: true,
            tables: parseInt(tCount.rows[0].count),
            fields: parseInt(fCount.rows[0].count),
            links: parseInt(lCount.rows[0].count),
            summary: results
        });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch(e) {}
        res.status(500).json({ error: err.message, stack: err.stack?.split('\n')[0] });
    } finally {
        client.release();
    }
});

// ============================================================================
// SEED ENDPOINT - Load XSD metadata into dictionary tables
// ============================================================================

app.post('/api/seed', async (req, res) => {
    const { xsdData } = req.body;
    if (!xsdData) return res.status(400).json({ error: 'No xsdData provided' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Clear existing dictionary data
        await client.query('DELETE FROM cd_tabl_fiel');
        await client.query('DELETE FROM cd_fields');
        await client.query('DELETE FROM cd_tables');
        
        // Drop and recreate constraints for clean insert
        try { await client.query('ALTER TABLE cd_tabl_fiel DROP CONSTRAINT IF EXISTS cd_tabl_fiel_pkey'); } catch(e) {}
        try { await client.query('ALTER TABLE cd_fields DROP CONSTRAINT IF EXISTS cd_fields_pkey'); } catch(e) {}
        
        // Classify all tables into categories
        const categories = { lookups: [], entities: [], subtables: [], links: [] };
        const seenTables = new Set();
        
        for (const [tableName, fieldStr] of Object.entries(xsdData)) {
            const upper = tableName.toUpperCase();
            if (seenTables.has(upper)) continue;
            seenTables.add(upper);
            
            const entry = { name: upper, fields: fieldStr };
            
            if (upper.startsWith('CD_LK_') || upper.startsWith('LK_')) {
                categories.lookups.push(entry);
            } else if (upper.match(/_SUBKEYS$/) || upper.match(/_USER$/) || upper.match(/_FILES$/) || 
                       upper.match(/_GALLERY$/) || upper.match(/_IMAGES$/) || upper.match(/_TEMP$/) ||
                       upper.match(/_LOGS$/) || upper.match(/_REMOTE$/) || upper.match(/_CHECKLIST$/) ||
                       upper.match(/_EXECUTION_LOG$/) || upper.match(/_CLUSTERSETTINGS$/) ||
                       upper.match(/_FIELDKEY$/) || upper.match(/_FIELDVALUE$/) || upper.match(/_KINDS$/) ||
                       upper.match(/_LINKEDITORVISIBILITY$/) || upper.match(/_MATCH$/) ||
                       upper.match(/_TABSETTINGS$/) || upper.match(/_FILTERINGSETTINGS$/) ||
                       upper.match(/_RESTRICTIONS$/) || upper.match(/_ACTIONPARTIES$/) ||
                       upper.match(/_COMPANYADDRESSES$/) || upper.match(/_FULLADDRESS$/) ||
                       upper.match(/_POSTCODECHECK$/) || upper.match(/_SCALES$/) ||
                       upper.match(/_INVOICING.*$/) || upper.match(/_DEPRECIATION$/) ||
                       upper.match(/_SCHEDULEDDOWNTIME$/) || upper.match(/_CALIBRATIEDATA$/)) {
                categories.subtables.push(entry);
            } else {
                // Check if it's a link table: pattern XXXX_YYYY (4-letter prefix _ 4-letter suffix)
                const parts = upper.split('_');
                if (parts.length === 2 && parts[0].length >= 3 && parts[0].length <= 5 && 
                    parts[1].length >= 3 && parts[1].length <= 5 &&
                    !upper.startsWith('CD_') && !upper.startsWith('SYS_') && !upper.startsWith('LK_') &&
                    // Known entity names that look like links but aren't
                    !['WORKORDER','DATAIMPORT','PURCHASEADVICES','INVOICESCHEDULE','PRODUCTIONPLANNING'].includes(upper)) {
                    categories.links.push(entry);
                } else {
                    categories.entities.push(entry);
                }
            }
        }
        
        // Insert in order: 1=lookups, 2=entities, 3=subtables, 4=links
        const orderedTables = [
            ...categories.lookups.map(t => ({ ...t, fType: 2 })),
            ...categories.entities.map(t => ({ ...t, fType: t.name.startsWith('SYS_') ? 5 : 1 })),
            ...categories.subtables.map(t => ({ ...t, fType: 4 })),
            ...categories.links.map(t => ({ ...t, fType: 3 })),
        ];
        
        let tableId = 1;
        let fieldId = 1;
        let linkId = 1;
        const tableResults = [];
        
        for (const table of orderedTables) {
            // Insert into cd_tables
            await client.query(
                'INSERT INTO cd_tables (k_table, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                [tableId, table.name, table.fType, tableId]
            );
            
            // Parse fields - deduplicate within table
            const fieldDefs = table.fields.split(',').map(f => f.trim());
            const seenFieldsInTable = new Set();
            let fieldSort = 1;
            
            for (const fdef of fieldDefs) {
                const parts = fdef.split(':');
                if (parts.length < 2) continue;
                const fname = parts[0].trim().toUpperCase();
                const ftype = parts[1].trim();
                
                if (!fname || seenFieldsInTable.has(fname)) continue;
                seenFieldsInTable.add(fname);
                
                // Every field gets a unique k_field (each table-field combo is unique)
                await client.query(
                    'INSERT INTO cd_fields (k_field, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                    [fieldId, fname, ftype === 'i' ? 1 : (ftype === 's' ? 2 : (ftype === 'b' ? 3 : (ftype === 'd' ? 4 : 5))), fieldSort]
                );
                
                // Insert link: cd_tabl_fiel
                await client.query(
                    'INSERT INTO cd_tabl_fiel (k_fiel, k_tabl, k_seq, main, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                    [fieldId, tableId, fieldSort, fieldSort === 1]
                );
                
                fieldId++;
                linkId++;
                fieldSort++;
            }
            
            tableResults.push({ table: table.name, fields: seenFieldsInTable.size, type: table.fType });
            tableId++;
        }
        
        await client.query('COMMIT');
        
        // Update stats
        await client.query('ANALYZE cd_tables');
        await client.query('ANALYZE cd_fields');
        await client.query('ANALYZE cd_tabl_fiel');
        
        const summary = {
            lookups: categories.lookups.length,
            entities: categories.entities.length,
            subtables: categories.subtables.length,
            links: categories.links.length,
        };
        
        res.json({ 
            success: true, 
            tables: tableResults.length, 
            fields: fieldId - 1,
            summary,
            details: tableResults 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// IMPORT XML - Large file upload & parse into CD_ tables
// ============================================================================

// ============================================================================
// IMPORT XML - Large file upload & parse into CD_ tables
// Format: <CD_Verspaning><CD_TABLENAME><field>val</field>...</CD_TABLENAME>...</CD_Verspaning>
// ============================================================================

app.post('/api/import-xml', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
    const client = await pool.connect();
    try {
        const buf = req.body;
        
        // Collect XML content from file(s)
        let xmlParts = [];
        
        // Detect ZIP (magic bytes PK)
        if (buf.length > 2 && buf[0] === 0x50 && buf[1] === 0x4B) {
            const zip = new AdmZip(buf);
            const entries = zip.getEntries();
            for (const entry of entries) {
                if (entry.entryName.toLowerCase().endsWith('.xml') && !entry.isDirectory) {
                    xmlParts.push(entry.getData().toString('utf-8'));
                }
            }
        } else {
            xmlParts.push(buf.toString('utf-8'));
        }
        
        // Collect all rows per table from all XML parts
        const tableRows = {};
        
        for (const raw of xmlParts) {
        // Strip dataset wrapper(s) like <CD_Verspaning> or any root element
        // Strip dataset wrappers like <CD_Verspaning>, <Database>, etc.
        let stripped = raw.trim();
        // Find first tag
        const firstTagMatch = stripped.match(/^<([A-Za-z_][A-Za-z_0-9]*)[^>]*>/);
        if (firstTagMatch) {
            const wrapTag = firstTagMatch[1];
            // Remove all open/close of this wrapper tag
            stripped = stripped.replace(new RegExp('</?(' + wrapTag + ')[^>]*>', 'gi'), '').trim();
        }
        
        // Match all record elements (tags whose content contains child tags)
        const recordRegex = /<([A-Z][A-Za-z_0-9]+)>([\s\S]*?)<\/\1>/g;
        let match;
        
        while ((match = recordRegex.exec(stripped)) !== null) {
            const tagName = match[1];
            
            const tableName = tagName.toLowerCase();
            if (!tableRows[tableName]) tableRows[tableName] = [];
            
            const rowXml = match[2];
            const row = {};
            const fieldRegex = /<([A-Za-z_0-9]+?)>([\s\S]*?)<\/\1>/g;
            let fMatch;
            
            while ((fMatch = fieldRegex.exec(rowXml)) !== null) {
                let fname = fMatch[1].toLowerCase();
                if (fname === 'n') fname = 'name';
                const fval = fMatch[2].trim();
                if (fval !== '') row[fname] = fval;
            }
            
            if (Object.keys(row).length > 0) {
                tableRows[tableName].push(row);
            }
        }
        } // end xmlParts loop
        
        const tableNames = Object.keys(tableRows);
        if (tableNames.length === 0) {
            return res.json({ success: false, error: 'No records found in file' });
        }
        
        const importResults = [];
        let totalRows = 0;
        
        // Sort: lookups(1) > entities(2) > subs(3) > links(4)
        const ordered = tableNames.sort((a, b) => {
            const order = (nm) => {
                if (nm.startsWith('cd_lk_')) return 1;
                if (nm.match(/_(?:execution_log|logs|remote|checklist|clustersettings|fieldkey|fieldvalue|kinds|linkeditorvisibility|match|tabsettings|filteringsettings|restrictions)$/)) return 3;
                if (nm.match(/^cd_[a-z]{3,5}_[a-z]{3,5}$/) && !nm.startsWith('cd_lk_')) return 4;
                return 2;
            };
            return order(a) - order(b);
        });
        
        await client.query('BEGIN');
        
        for (const tableName of ordered) {
            const rows = tableRows[tableName];
            if (!rows || rows.length === 0) continue;
            
            const exists = await client.query(
                "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
                [tableName]
            );
            if (exists.rows.length === 0) {
                importResults.push({ table: tableName, rows: 0, total: rows.length, error: 'not in DB' });
                continue;
            }
            
            const colInfo = await client.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
                [tableName]
            );
            const dbCols = {};
            colInfo.rows.forEach(c => { dbCols[c.column_name] = c.data_type; });
            
            // Auto-create missing columns based on first row's data
            if (rows.length > 0) {
                const sampleFields = new Set();
                // Scan first 10 rows for all field names
                for (const r of rows.slice(0, 10)) {
                    for (const k of Object.keys(r)) {
                        const colName = k === 'n' ? 'name' : k;
                        sampleFields.add(colName);
                    }
                }
                for (const fname of sampleFields) {
                    if (!dbCols[fname]) {
                        // Guess type from field name patterns
                        let colType = 'text';
                        if (fname.startsWith('k_') || fname.startsWith('f_') || fname === 'sort' || fname === 'createdby' || fname === 'changedby' || fname === 'storagesize' || fname === 'flags' || fname === 'labelpos') colType = 'integer';
                        else if (fname.startsWith('is_') || fname === 'enabled' || fname === 'main' || fname === 'collapsible' || fname === 'executesync' || fname === 'allowcustomvalue' || fname === 'sort_description' || fname === 'filter_subtable' || fname === 'filter_subtable_k_seq' || fname === 'allowcreatingrecords' || fname === 'use_field_name' || fname === 'showpathrunner' || fname === 'linkrequired' || fname === 'zero_score' || fname === 'full_width' || fname === 'connected') colType = 'boolean';
                        else if (fname === 'createdate' || fname === 'changedate' || fname === 'laststatusdate' || fname === 'lifedate') colType = 'timestamptz';
                        else if (fname === 'replicationid') colType = 'uuid';
                        else if (fname === 'graphical' || fname === 'memo' || fname === 'memo_en' || fname === 'memo_nl') colType = 'bytea';
                        
                        try {
                            await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${fname}" ${colType}`);
                            dbCols[fname] = colType;
                        } catch(e) { /* column might already exist */ }
                    }
                }
            }
            
            await client.query(`TRUNCATE "${tableName}" CASCADE`);
            
            // Get primary key columns for upsert
            const pkResult = await client.query(`
                SELECT kcu.column_name FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY'
            `, [tableName]);
            const pkCols = pkResult.rows.map(r => r.column_name);
            
            // Widen all varchar columns to text to match XSD xs:string (unlimited)
            for (const [colName, dtype] of Object.entries(dbCols)) {
                if (dtype === 'character varying') {
                    try {
                        await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${colName}" TYPE text`);
                        dbCols[colName] = 'text';
                    } catch(e) {}
                }
            }
            
            let inserted = 0, errors = 0, lastError = '';
            
            for (const row of rows) {
                const cols = [], vals = [], ph = [];
                let pi = 1;
                
                for (const [col, val] of Object.entries(row)) {
                    if (!dbCols[col]) continue;
                    const dtype = dbCols[col];
                    let pgVal = val;
                    
                    if (dtype === 'integer' || dtype === 'bigint') {
                        pgVal = parseInt(val); if (isNaN(pgVal)) continue;
                    } else if (dtype === 'boolean') {
                        pgVal = val === 'true' || val === '1';
                    } else if (dtype === 'bytea') {
                        try { pgVal = Buffer.from(val, 'base64'); } catch(e) { continue; }
                    }
                    
                    cols.push(`"${col}"`); vals.push(pgVal); ph.push(`$${pi}`); pi++;
                }
                
                if (cols.length === 0) continue;
                try {
                    await client.query('SAVEPOINT sp');
                    // Find primary key column for upsert
                    const pkCol = Object.keys(dbCols).find(c => pkCols.includes(c));
                    if (pkCol && cols.includes(`"${pkCol}"`)) {
                        const updateSet = cols.filter(c => c !== `"${pkCol}"`).map(c => `${c} = EXCLUDED.${c}`).join(', ');
                        if (updateSet) {
                            await client.query(`INSERT INTO "${tableName}" (${cols.join(',')}) VALUES (${ph.join(',')}) ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateSet}`, vals);
                        } else {
                            await client.query(`INSERT INTO "${tableName}" (${cols.join(',')}) VALUES (${ph.join(',')}) ON CONFLICT ("${pkCol}") DO NOTHING`, vals);
                        }
                    } else {
                        await client.query(`INSERT INTO "${tableName}" (${cols.join(',')}) VALUES (${ph.join(',')})`, vals);
                    }
                    await client.query('RELEASE SAVEPOINT sp');
                    inserted++;
                } catch (e) {
                    await client.query('ROLLBACK TO SAVEPOINT sp');
                    errors++;
                    if (errors <= 3) lastError = e.message;
                }
            }
            
            totalRows += inserted;
            importResults.push({ table: tableName, rows: inserted, total: rows.length, errors, lastError });
        }
        
        await client.query('COMMIT');
        for (const r of importResults) {
            if (r.rows > 0) try { await client.query(`ANALYZE "${r.table}"`); } catch(e) {}
        }
        
        invalidateSchemaCache();
        res.json({ success: true, tablesProcessed: importResults.length, totalRows, details: importResults });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch(e) {}
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;

// ============================================================================
// BACKUP - export all CD_ table data as JSON
// ============================================================================
app.get('/api/backup', async (req, res) => {
    try {
        const tablesRes = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'cd_%' ORDER BY table_name"
        );
        const backup = { timestamp: new Date().toISOString(), tables: {} };
        for (const { table_name } of tablesRes.rows) {
            try {
                const { rows } = await pool.query(`SELECT * FROM "${table_name}"`);
                backup.tables[table_name] = rows;
            } catch(e) {
                backup.tables[table_name] = { error: e.message };
            }
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=cd_backup_' + new Date().toISOString().slice(0,10) + '.json');
        res.json(backup);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// BUILD TABLES - create SYS_ and user tables from cd_tables + cd_fields
// Reads table/field definitions from dictionary, creates PostgreSQL tables
// ============================================================================
app.post('/api/build-tables', express.json({ limit: '1mb' }), async (req, res) => {
    const client = await pool.connect();
    const filterTables = req.body && req.body.tables ? req.body.tables.map(t => t.toUpperCase()) : null;
    try {
        // f_type mapping from cd_fields/cd_controls to PostgreSQL types
        // f_type values: 1=integer, 2=string/text, 3=boolean, 4=datetime, 5=binary, 6=uuid
        const pgTypeMap = {
            1: 'integer',
            2: 'text',
            3: 'boolean',
            4: 'timestamptz',
            5: 'bytea',
            6: 'uuid',
        };
        
        // Get all tables from cd_tables
        const tablesRes = await client.query(
            'SELECT k_table, name, f_type FROM cd_tables ORDER BY sort'
        );
        
        // Get all fields with their table assignments
        const fieldsRes = await client.query(`
            SELECT tf.k_tabl, tf.k_fiel, tf.k_seq, tf.main, f.name as field_name, f.f_type as field_type
            FROM cd_tabl_fiel tf
            JOIN cd_fields f ON tf.k_fiel = f.k_field
            ORDER BY tf.k_tabl, tf.k_seq
        `);
        
        // Group fields by table
        const fieldsByTable = {};
        for (const f of fieldsRes.rows) {
            if (!fieldsByTable[f.k_tabl]) fieldsByTable[f.k_tabl] = [];
            fieldsByTable[f.k_tabl].push(f);
        }
        
        const results = [];
        let created = 0, skipped = 0, errored = 0;
        
        await client.query('BEGIN');
        
        for (const table of tablesRes.rows) {
            const tName = table.name.toLowerCase();
            const tUpper = table.name.toUpperCase();
            const fields = fieldsByTable[table.k_table] || [];
            
            // Skip CD_ tables (they already exist as dictionary)
            if (tName.startsWith('cd_')) {
                skipped++;
                continue;
            }
            
            // If filter specified, skip non-matching tables (supports * wildcard)
            if (filterTables) {
                const matches = filterTables.some(f => {
                    if (f.includes('*')) {
                        const regex = new RegExp('^' + f.replace(/\*/g, '.*') + '$');
                        return regex.test(tUpper);
                    }
                    return f === tUpper;
                });
                if (!matches) { skipped++; continue; }
            }
            
            // Check if table already exists
            const exists = await client.query(
                "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1", [tName]
            );
            
            if (exists.rows.length > 0) {
                // Table exists - add any missing columns
                const existCols = await client.query(
                    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [tName]
                );
                const existColNames = existCols.rows.map(r => r.column_name.toLowerCase());
                
                let added = 0;
                for (const f of fields) {
                    const colName = f.field_name.toLowerCase();
                    if (!existColNames.includes(colName)) {
                        const pgType = pgTypeMap[f.field_type] || 'text';
                        try {
                            await client.query('SAVEPOINT sp_col');
                            await client.query(`ALTER TABLE "${tName}" ADD COLUMN "${colName}" ${pgType}`);
                            await client.query('RELEASE SAVEPOINT sp_col');
                            added++;
                        } catch(e) {
                            await client.query('ROLLBACK TO SAVEPOINT sp_col');
                        }
                    }
                }
                results.push({ table: table.name, status: 'exists', fields: fields.length, added });
                skipped++;
                continue;
            }
            
            // Build CREATE TABLE statement
            const colDefs = [];
            const pkCols = [];
            
            for (const f of fields) {
                const colName = f.field_name.toLowerCase();
                const pgType = pgTypeMap[f.field_type] || 'text';
                colDefs.push(`"${colName}" ${pgType}`);
                
                // K_ prefix = primary key candidate
                if (f.main || (f.field_name.startsWith('K_') && f.k_seq <= 3)) {
                    pkCols.push(`"${colName}"`);
                }
            }
            
            if (colDefs.length === 0) {
                results.push({ table: table.name, status: 'skipped', reason: 'no fields' });
                skipped++;
                continue;
            }
            
            // Add REPLICATIONID if not present
            const hasRepId = fields.some(f => f.field_name.toUpperCase() === 'REPLICATIONID');
            if (!hasRepId) {
                colDefs.push('"replicationid" uuid DEFAULT gen_random_uuid()');
            }
            
            let sql = `CREATE TABLE "${tName}" (\n  ${colDefs.join(',\n  ')}`;
            if (pkCols.length > 0) {
                sql += `,\n  PRIMARY KEY (${pkCols.join(', ')})`;
            }
            sql += '\n)';
            
            try {
                await client.query('SAVEPOINT sp_tbl');
                await client.query(sql);
                await client.query('RELEASE SAVEPOINT sp_tbl');
                results.push({ table: table.name, status: 'created', fields: fields.length, pk: pkCols.length });
                created++;
            } catch(e) {
                await client.query('ROLLBACK TO SAVEPOINT sp_tbl');
                results.push({ table: table.name, status: 'error', error: e.message });
                errored++;
            }
        }
        
        await client.query('COMMIT');
        
        invalidateSchemaCache();
        res.json({
            success: true,
            created,
            skipped,
            errored,
            total: tablesRes.rows.length,
            details: results
        });
    } catch(err) {
        try { await client.query('ROLLBACK'); } catch(e) {}
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});


// ============================================================================
// SCHEMA XML IMPORT - imports Verspaning-style schema into CD_ tables
// Structure: cd_tables + cd_fields + cd_tabl_fiel + cd_controls + cd_fiel_cntr
// ============================================================================
app.post('/api/import-schema', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
    const client = await pool.connect();
    try {
        let xml = req.body.toString('utf-8').replace(/\r/g, '');
        const lines = xml.split('\n').map(l => l.trim());
        
        // Parse XML
        let dbName = null, inTables = false, tableName = null;
        let tables = [], fields = [], fieldName = null;
        
        for (const s of lines) {
            const nameMatch = s.match(/^<Name>(.+)<\/Name>$/i);
            const typeMatch = s.match(/^<Type>(.+)<\/Type>$/i);
            if (s === '<Tables>') { inTables = true; tableName = null; fields = []; }
            else if (s === '</Tables>') { if (tableName) tables.push({ name: tableName, fields: [...fields] }); inTables = false; }
            else if (nameMatch) {
                if (!inTables && !dbName) dbName = nameMatch[1];
                else if (inTables && !tableName) tableName = nameMatch[1];
                else if (inTables) fieldName = nameMatch[1];
            }
            else if (typeMatch && fieldName && inTables) { fields.push({ name: fieldName, type: typeMatch[1] }); fieldName = null; }
        }
        
        if (tables.length === 0) return res.json({ success: false, error: 'No tables found in schema XML' });
        
        // Check columns in each CD_ table
        async function getCols(t) {
            const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [t]);
            return r.rows.map(r => r.column_name);
        }
        const tabCols = await getCols('cd_tables');
        const fldCols = await getCols('cd_fields');
        const tflCols = await getCols('cd_tabl_fiel');
        const ctrlCols = await getCols('cd_controls');
        const fcCols = await getCols('cd_fiel_cntr');
        
        // Control f_type mapping: XML Type -> integer
        const ctrlFTypeMap = {
            'PKey': 1, 'Text': 2, 'Integer': 1, 'Decimal': 2, 'Currency': 2,
            'YesNo': 3, 'Date': 4, 'DateTime': 4, 'Time': 4, 'TimeSpan': 2,
            'Lookup': 2, 'Reference': 2, 'Memo': 2, 'Image': 5, 'Document': 5,
            'Guid': 6, 'Password': 2, 'Alias': 2, 'Sort': 1, 'Color': 2,
            'Property': 2, 'MultiSelect': 2, 'SPIM': 2,
        };
        
        // Table f_type: 1=entity, 2=lookup, 3=link, 4=subtable
        function getTableFType(name) {
            if (name.startsWith('CD_LK_') || name.startsWith('LK_')) return 2;
            const base = name.replace(/^(CD_|SYS_)/, '');
            if (!base.includes('_')) return 1;
            const parts = base.split('_');
            if (parts.length === 2 && parts[0].length <= 5 && parts[1].length <= 5) return 3;
            return 4;
        }
        
        function buildInsert(table, colMap) {
            const cols = [], vals = [], phs = []; let pi = 1;
            for (const [col, val] of Object.entries(colMap)) { cols.push('"'+col+'"'); vals.push(val); phs.push('$'+pi++); }
            return { sql: `INSERT INTO "${table}" (${cols.join(',')}) VALUES (${phs.join(',')})`, vals };
        }
        
        await client.query('BEGIN');
        
        const errors = [];
        let tablesImported = 0, fieldsImported = 0, linksCreated = 0, controlsCreated = 0, fielCntrCreated = 0;
        
        // Drop PK constraints
        const constraints = await client.query(`
            SELECT tc.constraint_name, tc.table_name FROM information_schema.table_constraints tc
            WHERE tc.table_schema='public' AND tc.table_name IN ('cd_tables','cd_fields','cd_tabl_fiel','cd_controls','cd_fiel_cntr')
            AND tc.constraint_type='PRIMARY KEY'`);
        for (const c of constraints.rows) {
            try { await client.query(`ALTER TABLE "${c.table_name}" DROP CONSTRAINT IF EXISTS "${c.constraint_name}"`); } catch(e) {}
        }
        
        // Clear
        if (fcCols.length > 0) try { await client.query('DELETE FROM cd_fiel_cntr'); } catch(e) {}
        if (ctrlCols.length > 0) try { await client.query('DELETE FROM cd_controls'); } catch(e) {}
        if (tflCols.length > 0) try { await client.query('DELETE FROM cd_tabl_fiel'); } catch(e) {}
        try { await client.query('DELETE FROM cd_fields'); } catch(e) {}
        try { await client.query('DELETE FROM cd_tables'); } catch(e) {}
        
        let tableId = 1, fieldId = 1, controlId = 1;
        
        for (const table of tables) {
            const fType = getTableFType(table.name);
            
            // cd_tables
            const tMap = { k_table: tableId };
            if (tabCols.includes('name')) tMap.name = table.name;
            if (tabCols.includes('f_type')) tMap.f_type = fType;
            if (tabCols.includes('sort')) tMap.sort = tableId;
            if (tabCols.includes('createdate')) tMap.createdate = new Date();
            if (tabCols.includes('changedate')) tMap.changedate = new Date();
            
            try {
                await client.query('SAVEPOINT sp');
                const q = buildInsert('cd_tables', tMap);
                await client.query(q.sql, q.vals);
                await client.query('RELEASE SAVEPOINT sp');
                tablesImported++;
            } catch(e) {
                await client.query('ROLLBACK TO SAVEPOINT sp');
                errors.push('cd_tables ' + table.name + ': ' + e.message);
                tableId++; continue;
            }
            
            let fieldSort = 1;
            for (const field of table.fields) {
                const fFieldType = ctrlFTypeMap[field.type] || 2;
                const isPk = field.name.startsWith('K_') && fieldSort <= 3;
                
                // cd_fields
                const fMap = { k_field: fieldId };
                if (fldCols.includes('name')) fMap.name = field.name;
                if (fldCols.includes('f_type')) fMap.f_type = fFieldType;
                if (fldCols.includes('sort')) fMap.sort = fieldSort;
                if (fldCols.includes('createdate')) fMap.createdate = new Date();
                if (fldCols.includes('changedate')) fMap.changedate = new Date();
                
                try {
                    await client.query('SAVEPOINT sp');
                    await client.query(buildInsert('cd_fields', fMap).sql, buildInsert('cd_fields', fMap).vals);
                    await client.query('RELEASE SAVEPOINT sp');
                    fieldsImported++;
                } catch(e) {
                    await client.query('ROLLBACK TO SAVEPOINT sp');
                    errors.push('cd_fields ' + table.name + '.' + field.name + ': ' + e.message);
                    fieldId++; fieldSort++; continue;
                }
                
                // cd_tabl_fiel
                if (tflCols.length > 0) {
                    const lMap = {};
                    if (tflCols.includes('k_fiel')) lMap.k_fiel = fieldId;
                    if (tflCols.includes('k_tabl')) lMap.k_tabl = tableId;
                    if (tflCols.includes('k_seq')) lMap.k_seq = fieldSort;
                    if (tflCols.includes('main')) lMap.main = isPk;
                    if (tflCols.includes('createdate')) lMap.createdate = new Date();
                    if (tflCols.includes('changedate')) lMap.changedate = new Date();
                    
                    if (Object.keys(lMap).length >= 2) {
                        try {
                            await client.query('SAVEPOINT sp');
                            const q = buildInsert('cd_tabl_fiel', lMap);
                            await client.query(q.sql, q.vals);
                            await client.query('RELEASE SAVEPOINT sp');
                            linksCreated++;
                        } catch(e) {
                            await client.query('ROLLBACK TO SAVEPOINT sp');
                            errors.push('cd_tabl_fiel ' + table.name + '.' + field.name + ': ' + e.message);
                        }
                    }
                }
                
                // cd_controls (one per field)
                if (ctrlCols.length > 0) {
                    const cMap = {};
                    if (ctrlCols.includes('k_control')) cMap.k_control = controlId;
                    if (ctrlCols.includes('name')) cMap.name = field.name;
                    if (ctrlCols.includes('f_type')) cMap.f_type = fFieldType;
                    if (ctrlCols.includes('sort')) cMap.sort = fieldSort;
                    if (ctrlCols.includes('createdate')) cMap.createdate = new Date();
                    if (ctrlCols.includes('changedate')) cMap.changedate = new Date();
                    
                    if (Object.keys(cMap).length >= 2) {
                        try {
                            await client.query('SAVEPOINT sp');
                            const q = buildInsert('cd_controls', cMap);
                            await client.query(q.sql, q.vals);
                            await client.query('RELEASE SAVEPOINT sp');
                            controlsCreated++;
                        } catch(e) {
                            await client.query('ROLLBACK TO SAVEPOINT sp');
                            if (controlsCreated === 0 && errors.filter(x => x.startsWith('cd_controls')).length === 0)
                                errors.push('cd_controls: ' + e.message + ' (cols: ' + ctrlCols.join(',') + ')');
                        }
                    }
                }
                
                // cd_fiel_cntr (link field to control)
                if (fcCols.length > 0 && controlsCreated > 0) {
                    const fcMap = {};
                    if (fcCols.includes('k_fiel')) fcMap.k_fiel = fieldId;
                    if (fcCols.includes('k_cntr')) fcMap.k_cntr = controlId;
                    if (fcCols.includes('main')) fcMap.main = true;
                    if (fcCols.includes('sort')) fcMap.sort = fieldSort;
                    if (fcCols.includes('createdate')) fcMap.createdate = new Date();
                    if (fcCols.includes('changedate')) fcMap.changedate = new Date();
                    
                    if (Object.keys(fcMap).length >= 2) {
                        try {
                            await client.query('SAVEPOINT sp');
                            const q = buildInsert('cd_fiel_cntr', fcMap);
                            await client.query(q.sql, q.vals);
                            await client.query('RELEASE SAVEPOINT sp');
                            fielCntrCreated++;
                        } catch(e) {
                            await client.query('ROLLBACK TO SAVEPOINT sp');
                            if (fielCntrCreated === 0 && errors.filter(x => x.startsWith('cd_fiel_cntr')).length === 0)
                                errors.push('cd_fiel_cntr: ' + e.message + ' (cols: ' + fcCols.join(',') + ')');
                        }
                    }
                }
                
                controlId++; fieldId++; fieldSort++;
            }
            tableId++;
        }
        
        await client.query('COMMIT');
        
        try { await client.query('ANALYZE cd_tables'); } catch(e) {}
        try { await client.query('ANALYZE cd_fields'); } catch(e) {}
        try { await client.query('ANALYZE cd_tabl_fiel'); } catch(e) {}
        try { await client.query('ANALYZE cd_controls'); } catch(e) {}
        try { await client.query('ANALYZE cd_fiel_cntr'); } catch(e) {}
        
        invalidateSchemaCache();
        res.json({ 
            success: true, database: dbName,
            tablesImported, fieldsImported, linksCreated, controlsCreated, fielCntrCreated,
            errors: errors.length,
            errorList: errors.slice(0, 50),
            breakdown: {
                sys: tables.filter(t => t.name.startsWith('SYS_')).length,
                user: tables.filter(t => !t.name.startsWith('SYS_') && !t.name.startsWith('CD_')).length,
                cd: tables.filter(t => t.name.startsWith('CD_')).length,
            },
            columnsUsed: { cd_tables: tabCols, cd_fields: fldCols, cd_controls: ctrlCols, cd_fiel_cntr: fcCols }
        });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch(e) {}
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`MetalSpheeres API running on port ${PORT}`));
