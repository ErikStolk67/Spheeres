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
        // Strip dataset wrapper(s) like <CD_Verspaning>
        const stripped = raw.replace(/<\/?CD_[Vv]erspaning[^>]*>/g, '').trim();
        
        const recordRegex = /<(CD_[A-Za-z_]+)>([\s\S]*?)<\/\1>/g;
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
            return res.json({ success: false, error: 'No CD_ records found in file' });
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
                            await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${fname} ${colType}`);
                            dbCols[fname] = colType;
                        } catch(e) { /* column might already exist */ }
                    }
                }
            }
            
            await client.query(`TRUNCATE ${tableName} CASCADE`);
            
            // Widen all varchar columns to text to match XSD xs:string (unlimited)
            for (const [colName, dtype] of Object.entries(dbCols)) {
                if (dtype === 'character varying') {
                    try {
                        await client.query(`ALTER TABLE ${tableName} ALTER COLUMN "${colName}" TYPE text`);
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
                    await client.query(`INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${ph.join(',')})`, vals);
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
            if (r.rows > 0) try { await client.query(`ANALYZE ${r.table}`); } catch(e) {}
        }
        
        res.json({ success: true, tablesProcessed: importResults.length, totalRows, details: importResults });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch(e) {}
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`MetalSpheeres API running on port ${PORT}`));
