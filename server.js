const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

app.get('/api/databases', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_databases ORDER BY name');
    res.json(rows);
});

app.get('/api/tables', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM cd_tables ORDER BY sort_order');
    res.json(rows);
});

app.get('/api/tables/:id/fields', async (req, res) => {
    const { rows } = await pool.query(
        'SELECT * FROM cd_fields WHERE k_table = $1 ORDER BY sort_order', [req.params.id]
    );
    res.json(rows);
});

app.get('/api/fields', async (req, res) => {
    const { rows } = await pool.query(`
        SELECT f.*, t.name as table_name, t.table_type::text
        FROM cd_fields f JOIN cd_tables t ON f.k_table = t.k_table
        ORDER BY t.sort_order, f.sort_order
    `);
    res.json(rows);
});

app.post('/api/tables/:id/fields', async (req, res) => {
    const { name, data_type, max_length, is_required, control_type, lookup_table } = req.body;
    const k_table = req.params.id;
    try {
        const sortRes = await pool.query(
            "SELECT COALESCE(MAX(sort_order), 499) + 1 as next_sort FROM cd_fields WHERE k_table = $1 AND field_group = 'C'",
            [k_table]
        );
        const { rows } = await pool.query(`
            INSERT INTO cd_fields (k_field, k_table, name, alias, field_group, data_type,
                max_length, is_required, is_system, is_primary_key, is_foreign_key, fk_table, sort_order)
            VALUES (gen_random_uuid(), $1, $2, $2, 'C', $3, $4, $5, false, false, $6, $7, $8)
            RETURNING *
        `, [k_table, name, data_type, max_length || null, is_required || false,
            control_type === 'lookup', lookup_table || null, sortRes.rows[0].next_sort]);

        const field = rows[0];
        await pool.query(`
            INSERT INTO cd_controls (k_control, k_field, control_type, label, is_visible, is_readonly, is_required, lookup_table, sort_order)
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

app.post('/api/tables/:id/types', async (req, res) => {
    const { name } = req.body;
    try {
        const sortRes = await pool.query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM cd_types WHERE k_table = $1', [req.params.id]
        );
        const { rows } = await pool.query(`
            INSERT INTO cd_types (k_type, k_table, name, alias, sort_order)
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
    if (!table.startsWith('cd_')) {
        return res.status(403).json({ error: 'Only CD_ tables allowed' });
    }
    try {
        const { rows } = await pool.query(`SELECT * FROM "${table}" LIMIT 100`);
        res.json(rows);
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
        
        // Fix primary key on cd_tabl_fiel to be composite (k_fiel, k_tabl, k_seq)
        try {
            await client.query('ALTER TABLE cd_tabl_fiel DROP CONSTRAINT IF EXISTS cd_tabl_fiel_pkey');
            await client.query('ALTER TABLE cd_tabl_fiel ADD PRIMARY KEY (k_fiel, k_tabl, k_seq)');
        } catch(e) { /* constraint may already be correct */ }
        
        let tableId = 1;
        let fieldId = 1;
        const tableResults = [];
        const seenTables = new Set();
        const seenFieldNames = new Set(); // global dedup for cd_fields
        
        // Type mapping from XSD shortcodes
        const typeMap = { i: 'integer', s: 'varchar(100)', b: 'boolean', d: 'timestamptz', u: 'uuid', y: 'bytea' };
        
        for (const [tableName, fieldStr] of Object.entries(xsdData)) {
            const upperName = tableName.toUpperCase();
            
            // Skip duplicates
            if (seenTables.has(upperName)) continue;
            seenTables.add(upperName);
            
            // Determine table category
            const isCd = upperName.startsWith('CD_');
            const isSys = upperName.startsWith('SYS_');
            const isLookup = upperName.startsWith('CD_LK_') || upperName.startsWith('LK_');
            const isLink = upperName.match(/^[A-Z]{4}_[A-Z]{4}$/) && !isLookup;
            const isSub = upperName.includes('_SUBKEYS') || upperName.includes('_USER') || 
                          upperName.match(/_(?:EXECUTION_LOG|LOGS|REMOTE|CHECKLIST|CLUSTERSETTINGS|FIELDKEY|FIELDVALUE|KINDS|LINKEDITORVISIBILITY|MATCH|TABSETTINGS|FILTERINGSETTINGS|RESTRICTIONS|FILES|GALLERY|IMAGES|TEMP)$/);
            
            // Determine f_type: 1=entity, 2=lookup, 3=link, 4=subtable, 5=system
            let fType = 1; // entity
            if (isLookup) fType = 2;
            else if (isLink) fType = 3;
            else if (isSub) fType = 4;
            else if (isSys) fType = 5;
            
            // Insert into cd_tables
            await client.query(
                'INSERT INTO cd_tables (k_table, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                [tableId, upperName, fType, tableId]
            );
            
            // Parse fields - deduplicate within table
            const fieldDefs = fieldStr.split(',').map(f => f.trim());
            const seenFieldsInTable = new Set();
            let fieldSort = 1;
            
            for (const fdef of fieldDefs) {
                const parts = fdef.split(':');
                if (parts.length < 2) continue;
                const fname = parts[0].trim().toUpperCase();
                const ftype = parts[1].trim();
                
                if (!fname || seenFieldsInTable.has(fname)) continue;
                seenFieldsInTable.add(fname);
                
                // Check if this field name already exists in cd_fields (global)
                const fieldKey = fname;
                let currentFieldId;
                
                if (seenFieldNames.has(fieldKey)) {
                    // Field already exists, find its id for the link
                    const existing = await client.query('SELECT k_field FROM cd_fields WHERE name = $1 LIMIT 1', [fname]);
                    if (existing.rows.length > 0) {
                        currentFieldId = existing.rows[0].k_field;
                    } else {
                        currentFieldId = fieldId;
                        await client.query(
                            'INSERT INTO cd_fields (k_field, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                            [fieldId, fname, ftype === 'i' ? 1 : (ftype === 's' ? 2 : (ftype === 'b' ? 3 : (ftype === 'd' ? 4 : 5))), fieldSort]
                        );
                        fieldId++;
                    }
                } else {
                    seenFieldNames.add(fieldKey);
                    currentFieldId = fieldId;
                    await client.query(
                        'INSERT INTO cd_fields (k_field, name, f_type, sort, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                        [fieldId, fname, ftype === 'i' ? 1 : (ftype === 's' ? 2 : (ftype === 'b' ? 3 : (ftype === 'd' ? 4 : 5))), fieldSort]
                    );
                    fieldId++;
                }
                
                // Insert link: cd_tabl_fiel (composite PK: k_fiel + k_tabl)
                await client.query(
                    'INSERT INTO cd_tabl_fiel (k_fiel, k_tabl, k_seq, main, createdate, changedate) VALUES ($1, $2, $3, $4, now(), now())',
                    [currentFieldId, tableId, fieldSort, fieldSort === 1]
                );
                
                fieldSort++;
            }
            
            tableResults.push({ table: upperName, fields: seenFieldsInTable.size, type: fType });
            tableId++;
        }
        
        await client.query('COMMIT');
        
        // Update stats
        await client.query('ANALYZE cd_tables');
        await client.query('ANALYZE cd_fields');
        await client.query('ANALYZE cd_tabl_fiel');
        
        res.json({ 
            success: true, 
            tables: tableResults.length, 
            fields: fieldId - 1,
            details: tableResults 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`MetalSpheeres API running on port ${PORT}`));
