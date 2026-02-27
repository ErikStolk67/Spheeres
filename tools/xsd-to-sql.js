#!/usr/bin/env node
// ============================================================================
// XSD → PostgreSQL Migration Generator
// Reads the Spheeres dictionary XSD and generates SQL to align the database
// ============================================================================
const fs = require('fs');

const xsd = fs.readFileSync('/mnt/user-data/uploads/CD_Verspaning_27-02-26_11-46-43.xsd', 'utf-8');

// XSD type → PostgreSQL type mapping
function pgType(xsdType, name) {
    if (name === 'REPLICATIONID') return 'uuid';
    if (xsdType === 'xs:int') return 'integer';
    if (xsdType === 'xs:string') return name.length <= 10 ? 'varchar(100)' : 'varchar(500)';
    if (xsdType === 'xs:boolean') return 'boolean';
    if (xsdType === 'xs:dateTime') return 'timestamptz';
    if (xsdType === 'xs:base64Binary') return 'bytea';
    return 'text';
}

// Parse XSD
const tables = {};
const tableRegex = /<xs:element name="(CD_[^"]+)">\s*<xs:complexType>\s*<xs:sequence>([\s\S]*?)<\/xs:sequence>/g;
const fieldRegex = /<xs:element name="([^"]+)"[^>]*type="([^"]+)"[^>]*\/>/g;

let match;
while ((match = tableRegex.exec(xsd)) !== null) {
    const tableName = match[1].toLowerCase();
    if (tableName === 'cd_verspaning') continue; // skip root element
    const fieldsXml = match[2];
    const fields = [];
    
    let fmatch;
    const fr = new RegExp(fieldRegex.source, 'g');
    while ((fmatch = fr.exec(fieldsXml)) !== null) {
        const fname = fmatch[1].toLowerCase();
        const xtype = fmatch[2];
        fields.push({ name: fname, pgtype: pgType(xtype, fmatch[1]), xsdtype: xtype });
    }
    tables[tableName] = fields;
}

// Generate SQL
let sql = '-- ============================================================================\n';
sql += '-- MetalSpheeres Dictionary Migration from XSD\n';
sql += '-- Generated: ' + new Date().toISOString() + '\n';
sql += '-- Tables found in XSD: ' + Object.keys(tables).length + '\n';
sql += '-- ============================================================================\n\n';

// Determine primary key for each table
function getPrimaryKey(tableName, fields) {
    // Look for K_ field (singular)
    const kField = fields.find(f => f.name.startsWith('k_') && !f.name.startsWith('k_seq'));
    if (kField) return kField.name;
    // For link tables (XX_YY pattern), find the two K_ or F_ fields
    return null;
}

// Determine if it's a link table (has two FK-like primary keys)
function isLinkTable(tableName) {
    const parts = tableName.replace('cd_', '').split('_');
    return parts.length >= 2 && !['lk', 'fiel', 'form', 'tabl', 'type', 'life', 'role', 'canv', 'cntr', 'dbas', 'func', 'dico', 'dict'].includes(parts[0])
        ? false : parts.length === 2 && parts[0] !== 'lk';
}

for (const [tableName, fields] of Object.entries(tables).sort()) {
    const pk = getPrimaryKey(tableName, fields);
    
    sql += `-- ${tableName.toUpperCase()} (${fields.length} fields)\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
    
    const colDefs = [];
    for (const f of fields) {
        let def = `    ${f.name} ${f.pgtype}`;
        if (f.name === pk) {
            if (f.pgtype === 'integer') {
                def = `    ${f.name} integer NOT NULL`;
            } else {
                def = `    ${f.name} uuid NOT NULL DEFAULT gen_random_uuid()`;
            }
        }
        if (f.name === 'createdate' || f.name === 'changedate') {
            def += ' DEFAULT now()';
        }
        colDefs.push(def);
    }
    
    sql += colDefs.join(',\n');
    
    if (pk) {
        sql += `,\n    PRIMARY KEY (${pk})`;
    }
    
    sql += '\n);\n\n';
}

// Summary
sql += '-- ============================================================================\n';
sql += '-- Summary:\n';
const tableNames = Object.keys(tables).sort();
const mainTables = tableNames.filter(t => !t.includes('_') || t.split('_').length <= 2 || t.startsWith('cd_lk_'));
const linkTables = tableNames.filter(t => !mainTables.includes(t));
sql += `-- Main/Lookup tables: ${mainTables.length}\n`;
sql += `-- Link/Sub tables: ${linkTables.length}\n`;
sql += `-- Total: ${tableNames.length}\n`;
sql += '-- ============================================================================\n';

const outPath = '/home/claude/Spheeres/database/003_xsd_migration.sql';
fs.mkdirSync('/home/claude/Spheeres/database', { recursive: true });
fs.writeFileSync(outPath, sql);
console.log(`Generated: ${outPath}`);
console.log(`Tables: ${Object.keys(tables).length}`);

// Also print a summary
for (const [name, fields] of Object.entries(tables).sort()) {
    console.log(`  ${name}: ${fields.length} fields`);
}
