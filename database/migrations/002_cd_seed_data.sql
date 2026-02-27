-- ============================================================================
-- MetalSpheres - Default Dictionary Seed Data
-- Migration 002: Default metadata for new tenants
-- ============================================================================
-- This seed data is loaded for every new tenant. It defines the default
-- entity tables, system fields, lookup tables, and relationships.
-- ============================================================================

-- ============================================================================
-- DEFAULT DICTIONARY
-- ============================================================================
INSERT INTO cd_dictionaries (k_dictionaries, name, alias, memo)
VALUES ('00000000-0000-0000-0000-000000000001', 'MetalSpheres Default', 'default', 'Default dictionary template for new tenants');

-- ============================================================================
-- DEFAULT DATABASE
-- ============================================================================
INSERT INTO cd_databases (k_databases, k_dictionaries, name, alias)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Primary Database', 'primary');

-- Link dictionary to database
INSERT INTO cd_dict_data (k_dict, k_data, main)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true);

-- ============================================================================
-- DEFAULT ENTITY TABLES
-- ============================================================================
INSERT INTO cd_tables (k_tables, k_databases, name, alias, table_type, prefix_4, physical_name, sort_order) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Contacts',      'contacts',      'entity', 'CONT', 'contacts',      1),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Companies',     'companies',     'entity', 'COMP', 'companies',     2),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Projects',      'projects',      'entity', 'PROJ', 'projects',      3),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Cases',         'cases',         'entity', 'CASE', 'cases',         4),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Opportunities', 'opportunities', 'entity', 'OPPO', 'opportunities', 5),
    ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Agenda',        'agenda',        'entity', 'AGEN', 'agenda',        6),
    ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Documents',     'documents',     'entity', 'DOCU', 'documents',     7),
    ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Actions',       'actions',       'entity', 'ACTI', 'actions',       8);

-- ============================================================================
-- DEFAULT LOOKUP TABLES
-- ============================================================================
INSERT INTO cd_tables (k_tables, k_databases, name, alias, table_type, prefix_4, physical_name, sort_order) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Stats',         'stats',         'lookup', 'STAT', 'stats',         100);

-- ============================================================================
-- HELPER FUNCTION: Generate system fields for a table
-- ============================================================================
-- We use a DO block to generate the system fields for each table type
-- following the field structure from the architecture diagram.
-- ============================================================================

DO $$
DECLARE
    v_table RECORD;
    v_sort INTEGER;
BEGIN
    FOR v_table IN SELECT k_tables, name, table_type FROM cd_tables
                   WHERE k_databases = '00000000-0000-0000-0000-000000000002'
    LOOP
        v_sort := 0;

        -- ================================================================
        -- HEADER (H) fields - vary by table type
        -- ================================================================

        -- H: Primary Key (all table types)
        v_sort := v_sort + 10;
        INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_required, is_system, is_primary_key, sort_order)
        VALUES (gen_random_uuid(), v_table.k_tables, 'k_' || lower(v_table.name), 'key', 'H', 'uuid', true, true, true, v_sort);

        -- H: Second Key (link tables only - references second entity)
        IF v_table.table_type = 'link' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_required, is_system, is_primary_key, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'k_' || 'linked', 'key2', 'H', 'uuid', true, true, true, v_sort);
        END IF;

        -- H: K_SEQ (link, sub, lookup)
        IF v_table.table_type IN ('link', 'sub', 'lookup') THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_required, is_system, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'k_seq', 'sequence', 'H', 'uuid', false, true, v_sort);
        END IF;

        -- H: Alias (entity only)
        IF v_table.table_type = 'entity' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, max_length, is_system, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'alias', 'alias', 'H', 'varchar', 100, true, v_sort);
        END IF;

        -- H: F_Type (link only)
        IF v_table.table_type = 'link' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, is_foreign_key, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'f_type', 'type', 'H', 'uuid', true, true, v_sort);
        END IF;

        -- H: Main (link only)
        IF v_table.table_type = 'link' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'main', 'main', 'H', 'boolean', true, v_sort);
        END IF;

        -- ================================================================
        -- OPTIONAL HEADER (OH) fields
        -- ================================================================

        -- OH: Name (entity and lookup)
        IF v_table.table_type IN ('entity', 'lookup') THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, max_length, is_system, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'name', 'name', 'OH', 'varchar', 255, true, v_sort);
        END IF;

        -- ================================================================
        -- CUSTOM (C) fields - placeholder group marker
        -- ================================================================
        -- Custom fields are added by tenants at runtime.
        -- The C group is a marker position between OH and OF.

        -- ================================================================
        -- OPTIONAL FOOTER (OF) fields
        -- ================================================================

        -- OF: Memo (entity, link, sub)
        IF v_table.table_type IN ('entity', 'link', 'sub') THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'memo', 'memo', 'OF', 'text', true, v_sort);
        END IF;

        -- ================================================================
        -- FOOTER (F) fields
        -- ================================================================

        -- F: F_LifeStatus (entity only)
        IF v_table.table_type = 'entity' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, is_foreign_key, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'f_lifestatus', 'lifestatus', 'F', 'uuid', true, true, v_sort);
        END IF;

        -- F: F_Owner (entity only)
        IF v_table.table_type = 'entity' THEN
            v_sort := v_sort + 10;
            INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, is_foreign_key, sort_order)
            VALUES (gen_random_uuid(), v_table.k_tables, 'f_owner', 'owner', 'F', 'uuid', true, true, v_sort);
        END IF;

        -- F: F_CreatedBy (all table types)
        v_sort := v_sort + 10;
        INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, is_foreign_key, sort_order)
        VALUES (gen_random_uuid(), v_table.k_tables, 'f_createdby', 'createdby', 'F', 'uuid', true, true, v_sort);

        -- F: CreateDate (all table types)
        v_sort := v_sort + 10;
        INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, sort_order, default_value)
        VALUES (gen_random_uuid(), v_table.k_tables, 'createdate', 'createdate', 'F', 'timestamptz', true, v_sort, 'NOW()');

        -- F: F_ChangedBy (all table types)
        v_sort := v_sort + 10;
        INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, is_foreign_key, sort_order)
        VALUES (gen_random_uuid(), v_table.k_tables, 'f_changedby', 'changedby', 'F', 'uuid', true, true, v_sort);

        -- F: ChangeDate (all table types)
        v_sort := v_sort + 10;
        INSERT INTO cd_fields (k_fields, k_tables, name, alias, field_group, data_type, is_system, sort_order, default_value)
        VALUES (gen_random_uuid(), v_table.k_tables, 'changedate', 'changedate', 'F', 'timestamptz', true, v_sort, 'NOW()');

    END LOOP;
END $$;

-- ============================================================================
-- DEFAULT LIFE STATUSES
-- ============================================================================
INSERT INTO cd_lifestatuses (k_lifestatuses, k_tables, name, alias, color, sort_order, is_default, is_final) VALUES
    (gen_random_uuid(), NULL, 'Active',   'active',   '#22C55E', 1, true,  false),
    (gen_random_uuid(), NULL, 'Inactive', 'inactive', '#F59E0B', 2, false, false),
    (gen_random_uuid(), NULL, 'Archived', 'archived', '#6B7280', 3, false, true),
    (gen_random_uuid(), NULL, 'Deleted',  'deleted',  '#EF4444', 4, false, true);

-- ============================================================================
-- DEFAULT ROLES
-- ============================================================================
INSERT INTO cd_roles (k_roles, name, alias, description, is_system) VALUES
    (gen_random_uuid(), 'Administrator', 'admin',    'Full access to all features and settings', true),
    (gen_random_uuid(), 'Manager',       'manager',  'Can manage data and users within their scope', true),
    (gen_random_uuid(), 'User',          'user',     'Standard user with read/write access to assigned entities', true),
    (gen_random_uuid(), 'Viewer',        'viewer',   'Read-only access', true);

-- ============================================================================
-- DEFAULT FOLDERS (Navigation structure)
-- ============================================================================
INSERT INTO cd_folders (k_folders, name, alias, icon, sort_order) VALUES
    (gen_random_uuid(), 'CRM',        'crm',        'users',     1),
    (gen_random_uuid(), 'Production', 'production', 'factory',   2),
    (gen_random_uuid(), 'Planning',   'planning',   'calendar',  3),
    (gen_random_uuid(), 'Documents',  'documents',  'file-text', 4),
    (gen_random_uuid(), 'Settings',   'settings',   'settings',  5);
