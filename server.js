const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
    user: 'postgres',
    password: 'metalspheres',
    host: 'localhost',
    database: 'metalspheres',
    port: 5432,
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

const PORT = 3000;
app.listen(PORT, () => console.log(`MetalSpheeres API running on http://localhost:${PORT}`));
