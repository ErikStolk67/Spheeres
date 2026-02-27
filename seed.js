const API = 'https://spheeres.onrender.com/api/migrate';
const KEY = 'ms2026!';

async function run(sql, label) {
    const resp = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, key: KEY })
    });
    const data = await resp.json();
    console.log(label + ':', data.success ? `OK (${data.rowCount} rows)` : 'ERROR: ' + data.error);
    return data;
}

async function seed() {
    console.log('Seeding MetalSpheeres dictionary...\n');

    // 1. CD_DICTIONARIES
    await run(`INSERT INTO cd_dictionaries (k_dictionary, name, f_type, f_kind, memo_plaintext, createdate)
        VALUES (1, 'MetalSpheeres', 1, 1, 'Main dictionary', NOW())
        ON CONFLICT (k_dictionary) DO NOTHING`, 'Dictionary');

    // 2. CD_DATABASES
    await run(`INSERT INTO cd_databases (k_database, name, f_type, dbtype, url, memo_plaintext, createdate)
        VALUES (1, 'Neon Cloud', 1, 'PostgreSQL', 'neon.tech', 'Production cloud database', NOW())
        ON CONFLICT (k_database) DO NOTHING`, 'Database');

    // 3. CD_TABLES - All 79 tables from XSD
    const tables = [
        // Entities
        ['CD_CANVASES',1,44,'E'],['CD_FIELDS',2,42,'E'],['CD_TABLES',3,41,'E'],['CD_CONTROLS',4,36,'E'],
        ['CD_FORMS',5,26,'E'],['CD_TYPES',6,30,'E'],['CD_LIFESTATUSES',7,36,'E'],['CD_FUNCTIONS',8,31,'E'],
        ['CD_TRANSLATIONS',9,21,'E'],['CD_ROLES',10,20,'E'],['CD_DATABASES',11,24,'E'],['CD_DICTIONARIES',12,18,'E'],
        ['CD_LICENSES',13,37,'E'],['CD_FOLDERS',14,15,'E'],['CD_DICTIONARYCOMPARISONS',15,18,'E'],
        // Lookups
        ['CD_LK_ICONS',16,14,'L'],['CD_LK_FORMATS',17,17,'L'],['CD_LK_KINDS',18,15,'L'],
        ['CD_LK_RELATIONTYPEVALUES',19,16,'L'],['CD_LK_LANGUAGES',20,18,'L'],['CD_LK_FIELDFLAGS',21,13,'L'],
        ['CD_LK_SUBJECTAREAS',22,13,'L'],['CD_LK_TEMPLATES',23,10,'L'],['CD_LK_APIKINDS',24,12,'L'],
        ['CD_LK_APIPARAMTYPES',25,12,'L'],['CD_LK_APITYPES',26,12,'L'],['CD_LK_APPROVALS',27,12,'L'],
        ['CD_LK_DATAROLES',28,10,'L'],['CD_LK_FOLLOWUPMODES',29,12,'L'],['CD_LK_FONTSTYLES',30,10,'L'],
        ['CD_LK_IMPORTMETHODS',31,12,'L'],['CD_LK_MATCH_CONDITIONS',32,10,'L'],['CD_LK_MATCH_MODES',33,10,'L'],
        ['CD_LK_MATCH_TYPES',34,10,'L'],['CD_LK_NODETYPES',35,12,'L'],['CD_LK_OPERATIONTYPES',36,12,'L'],
        ['CD_LK_PARAMDATATYPES',37,12,'L'],['CD_LK_PROPERTYMODES',38,10,'L'],['CD_LK_PROTOCOLS',39,8,'L'],
        ['CD_LK_REQUESTTYPES',40,12,'L'],['CD_LK_SHAPES',41,8,'L'],['CD_LK_SHOWMODES',42,10,'L'],
        ['CD_LK_SIDES',43,8,'L'],['CD_LK_TRIGGERACTIONS',44,10,'L'],['CD_LK_TRIGGERSUBJECTS',45,10,'L'],
        // Links
        ['CD_TABL_FIEL',46,25,'K'],['CD_FIEL_CNTR',47,13,'K'],['CD_CANV_CANV',48,13,'K'],
        ['CD_FORM_CNTR',49,12,'K'],['CD_FORM_FORM',50,11,'K'],['CD_CNTR_CNTR',51,11,'K'],
        ['CD_TYPE_TYPE',52,12,'K'],['CD_TABL_FORM',53,13,'K'],['CD_TABL_TABL',54,11,'K'],
        ['CD_FIEL_FIEL',55,11,'K'],['CD_CANV_FUNC',56,11,'K'],['CD_CNTR_CANV',57,10,'K'],
        ['CD_DBAS_TABL',58,11,'K'],['CD_DBAS_DBAS',59,11,'K'],['CD_ROLE_LIFE',60,12,'K'],
        ['CD_LIFE_CANV',61,10,'K'],['CD_LIFE_LIFE',62,20,'K'],['CD_TYPE_LIFE',63,11,'K'],
        ['CD_DICT_DBAS',64,10,'K'],['CD_DICO_DICO',65,10,'K'],
        // Subtables
        ['CD_FIEL_FIELDKEY',66,10,'S'],['CD_FIEL_FIELDVALUE',67,9,'S'],['CD_FIEL_KINDS',68,9,'S'],
        ['CD_FIEL_LINKEDITORVISIBILITY',69,16,'S'],['CD_FIEL_CLUSTERSETTINGS',70,13,'S'],
        ['CD_FIEL_MATCH',71,13,'S'],['CD_LIFE_CHECKLIST',72,13,'S'],['CD_TABL_TABSETTINGS',73,13,'S'],
        ['CD_FORM_CNTR',74,12,'S'],['CD_CANV_EXECUTION_LOG',75,9,'S'],['CD_CANV_LOGS',76,9,'S'],
        ['CD_DBAS_REMOTE',77,9,'S'],['CD_TYPE_FILTERINGSETTINGS',78,8,'S'],['CD_TYPE_RESTRICTIONS',79,8,'S'],
    ];

    let tableSQL = `INSERT INTO cd_tables (k_table, name, f_type, sort, memo_plaintext, createdate) VALUES `;
    const vals = tables.map(([name, id, fields, cat]) =>
        `(${id}, '${name}', ${cat === 'E' ? 1 : cat === 'L' ? 2 : cat === 'K' ? 3 : 4}, ${id}, '${fields} fields - ${cat === 'E' ? 'Entity' : cat === 'L' ? 'Lookup' : cat === 'K' ? 'Link' : 'Subtable'}', NOW())`
    );
    tableSQL += vals.join(',\n') + ' ON CONFLICT (k_table) DO NOTHING';
    await run(tableSQL, 'Tables (' + tables.length + ')');

    // 4. CD_LK_FORMATS - Field formats
    await run(`INSERT INTO cd_lk_formats (k_format, name, datatype, enabled, sort, createdate) VALUES
        (1, 'Text', 'varchar', true, 1, NOW()),
        (2, 'Integer', 'integer', true, 2, NOW()),
        (3, 'Boolean', 'boolean', true, 3, NOW()),
        (4, 'Date', 'timestamptz', true, 4, NOW()),
        (5, 'Memo', 'text', true, 5, NOW()),
        (6, 'Binary', 'bytea', true, 6, NOW()),
        (7, 'UUID', 'uuid', true, 7, NOW()),
        (8, 'Decimal', 'numeric', true, 8, NOW()),
        (9, 'BigInt', 'bigint', true, 9, NOW()),
        (10, 'Varchar(100)', 'varchar(100)', true, 10, NOW()),
        (11, 'Varchar(500)', 'varchar(500)', true, 11, NOW())
        ON CONFLICT (k_format) DO NOTHING`, 'Formats');

    // 5. CD_LK_KINDS - Entity kinds
    await run(`INSERT INTO cd_lk_kinds (k_kind, name, name_en, name_nl, f_type, enabled, sort, createdate) VALUES
        (1, 'Standard', 'Standard', 'Standaard', 1, true, 1, NOW()),
        (2, 'System', 'System', 'Systeem', 1, true, 2, NOW()),
        (3, 'Custom', 'Custom', 'Aangepast', 1, true, 3, NOW()),
        (4, 'Lookup', 'Lookup', 'Opzoektabel', 2, true, 4, NOW()),
        (5, 'Link', 'Link', 'Koppeling', 3, true, 5, NOW())
        ON CONFLICT (k_kind) DO NOTHING`, 'Kinds');

    // 6. CD_LK_ICONS - Some basic icons
    await run(`INSERT INTO cd_lk_icons (k_icon, name, fontname, enabled, sort, createdate) VALUES
        (1, 'Table', 'fa-table', true, 1, NOW()),
        (2, 'Database', 'fa-database', true, 2, NOW()),
        (3, 'Link', 'fa-link', true, 3, NOW()),
        (4, 'List', 'fa-list', true, 4, NOW()),
        (5, 'Cog', 'fa-cog', true, 5, NOW()),
        (6, 'User', 'fa-user', true, 6, NOW()),
        (7, 'File', 'fa-file', true, 7, NOW()),
        (8, 'Folder', 'fa-folder', true, 8, NOW()),
        (9, 'Star', 'fa-star', true, 9, NOW()),
        (10, 'Check', 'fa-check', true, 10, NOW())
        ON CONFLICT (k_icon) DO NOTHING`, 'Icons');

    // 7. CD_ROLES
    await run(`INSERT INTO cd_roles (k_role, name, name_en, name_nl, f_kind, sort, createdate) VALUES
        (1, 'Administrator', 'Administrator', 'Beheerder', 1, 1, NOW()),
        (2, 'User', 'User', 'Gebruiker', 1, 2, NOW()),
        (3, 'Viewer', 'Viewer', 'Bekijker', 1, 3, NOW()),
        (4, 'Developer', 'Developer', 'Ontwikkelaar', 2, 4, NOW())
        ON CONFLICT (k_role) DO NOTHING`, 'Roles');

    // 8. CD_LIFESTATUSES
    await run(`INSERT INTO cd_lifestatuses (k_lifestatus, name, name_en, name_nl, f_kind, sort, enabled, createdate) VALUES
        (1, 'Active', 'Active', 'Actief', 1, 1, true, NOW()),
        (2, 'Inactive', 'Inactive', 'Inactief', 1, 2, true, NOW()),
        (3, 'Draft', 'Draft', 'Concept', 1, 3, true, NOW()),
        (4, 'Archived', 'Archived', 'Gearchiveerd', 1, 4, true, NOW()),
        (5, 'Deleted', 'Deleted', 'Verwijderd', 1, 5, true, NOW())
        ON CONFLICT (k_lifestatus) DO NOTHING`, 'Life statuses');

    // Check results
    console.log('\n--- Checking record counts ---');
    const resp = await fetch('https://spheeres.onrender.com/api/stats/counts');
    const counts = await resp.json();
    let total = 0;
    for (const [t, c] of Object.entries(counts)) {
        if (c > 0) { console.log(`  ${t}: ${c}`); total += c; }
    }
    console.log(`\nTotal records: ${total}`);
}

seed().catch(e => console.error('FATAL:', e));
