-- ============================================================================
-- MetalSpheres - Dictionary (CD_) Tables
-- Migration 001: Core dictionary structure
-- ============================================================================
-- The CD_ tables define the metadata that drives the entire application.
-- Every tenant starts with a default set of metadata and can extend it.
-- The dictionary follows the same N:N pattern as the user database.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE table_type AS ENUM ('entity', 'link', 'sub', 'lookup');
CREATE TYPE field_group AS ENUM ('H', 'OH', 'C', 'OF', 'F');
CREATE TYPE life_status AS ENUM ('active', 'inactive', 'archived', 'deleted');

-- ============================================================================
-- CD_DICTIONARIES - Root: defines each dictionary/tenant configuration
-- ============================================================================
CREATE TABLE cd_dictionaries (
    k_dictionaries      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_owner             UUID,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_dictionaries IS 'Root dictionary entry per tenant/configuration. Each tenant has one dictionary that describes their full data model.';

-- ============================================================================
-- CD_DATABASES - Database instances linked to a dictionary
-- ============================================================================
CREATE TABLE cd_databases (
    k_databases         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_dictionaries      UUID NOT NULL REFERENCES cd_dictionaries(k_dictionaries),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    connection_string   TEXT,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_owner             UUID,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_databases IS 'Physical database instances. A dictionary can describe multiple databases.';

-- ============================================================================
-- CD_TABLES - Table definitions in the dictionary
-- ============================================================================
CREATE TABLE cd_tables (
    k_tables            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_databases         UUID NOT NULL REFERENCES cd_databases(k_databases),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    table_type          table_type NOT NULL,
    prefix_4            VARCHAR(4),          -- 4-letter prefix for link table naming
    physical_name       VARCHAR(255),        -- actual table name in the database
    icon                VARCHAR(100),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_owner             UUID,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_tables IS 'Defines all tables: entities, link tables, sub tables, and lookups. prefix_4 is used for link table naming convention (e.g., COMP for Companies).';

-- ============================================================================
-- CD_FIELDS - Field definitions per table
-- ============================================================================
CREATE TABLE cd_fields (
    k_fields            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_tables            UUID NOT NULL REFERENCES cd_tables(k_tables),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    field_group         field_group NOT NULL,    -- H, OH, C, OF, F
    data_type           VARCHAR(50) NOT NULL,    -- varchar, integer, uuid, text, boolean, date, timestamp, numeric, etc.
    max_length          INTEGER,
    is_required         BOOLEAN NOT NULL DEFAULT false,
    is_system           BOOLEAN NOT NULL DEFAULT true,  -- true = system field, false = custom field
    is_primary_key      BOOLEAN NOT NULL DEFAULT false,
    is_foreign_key      BOOLEAN NOT NULL DEFAULT false,
    fk_table            UUID REFERENCES cd_tables(k_tables),  -- references which table if FK
    default_value       TEXT,
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_fields IS 'Field definitions per table. Groups: H=Header, OH=Optional Header, C=Custom, OF=Optional Footer, F=Footer. System fields are pre-defined; custom fields (C group) are tenant-extensible.';

-- ============================================================================
-- CD_TYPES - Type definitions (for categorizing entities)
-- ============================================================================
CREATE TABLE cd_types (
    k_types             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_tables            UUID NOT NULL REFERENCES cd_tables(k_tables),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    icon                VARCHAR(100),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_types IS 'Type categorization for entities. An entity can have multiple types (e.g., Contact types: Customer, Supplier, Employee).';

-- ============================================================================
-- CD_CONTROLS - UI control definitions for fields
-- ============================================================================
CREATE TABLE cd_controls (
    k_controls          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_fields            UUID NOT NULL REFERENCES cd_fields(k_fields),
    control_type        VARCHAR(50) NOT NULL,    -- textbox, dropdown, checkbox, datepicker, textarea, lookup, etc.
    label               VARCHAR(255),
    placeholder         VARCHAR(255),
    tooltip             VARCHAR(500),
    is_visible          BOOLEAN NOT NULL DEFAULT true,
    is_readonly         BOOLEAN NOT NULL DEFAULT false,
    is_required         BOOLEAN NOT NULL DEFAULT false,
    validation_rule     TEXT,
    lookup_table        UUID REFERENCES cd_tables(k_tables),  -- for dropdown/lookup controls
    sort_order          INTEGER DEFAULT 0,
    css_class           VARCHAR(255),
    width               INTEGER,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_controls IS 'UI control definitions linked to fields. Defines how a field is rendered on screen (dropdown, textbox, etc.).';

-- ============================================================================
-- CD_FORMS - Form/screen definitions
-- ============================================================================
CREATE TABLE cd_forms (
    k_forms             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_tables            UUID NOT NULL REFERENCES cd_tables(k_tables),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    form_type           VARCHAR(50),            -- list, detail, card, dialog, wizard
    layout_json         JSONB,                  -- flexible layout definition
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_forms IS 'Form/screen definitions. Each table can have multiple forms (list view, detail view, card view, etc.).';

-- ============================================================================
-- CD_FOLDERS - Folder/grouping structure for navigation
-- ============================================================================
CREATE TABLE cd_folders (
    k_folders           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_seq               UUID REFERENCES cd_folders(k_folders),  -- parent folder (self-referencing)
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    icon                VARCHAR(100),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_folders IS 'Navigation folder structure. Hierarchical via k_seq self-reference.';

-- ============================================================================
-- CD_LIFESTATUSES - Configurable lifecycle statuses
-- ============================================================================
CREATE TABLE cd_lifestatuses (
    k_lifestatuses      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    k_tables            UUID REFERENCES cd_tables(k_tables),    -- NULL = global, otherwise table-specific
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    color               VARCHAR(7),             -- hex color code
    icon                VARCHAR(100),
    sort_order          INTEGER DEFAULT 0,
    is_default          BOOLEAN NOT NULL DEFAULT false,
    is_final            BOOLEAN NOT NULL DEFAULT false,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_lifestatuses IS 'Configurable lifecycle statuses per table or global. Replaces the enum for tenant-customizable statuses.';

-- ============================================================================
-- CD_LICENSES - License/subscription definitions
-- ============================================================================
CREATE TABLE cd_licenses (
    k_licenses          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    max_users           INTEGER,
    max_tables          INTEGER,
    max_custom_fields   INTEGER,
    features_json       JSONB,                  -- feature flags per license tier
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_licenses IS 'License tier definitions controlling what tenants can do.';

-- ============================================================================
-- CD_CANVASES - Canvas/dashboard layout definitions
-- ============================================================================
CREATE TABLE cd_canvases (
    k_canvases          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    canvas_type         VARCHAR(50),            -- dashboard, report, kanban, calendar, etc.
    layout_json         JSONB,
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_canvases IS 'Dashboard and canvas layout definitions.';

-- ============================================================================
-- CD_ROLES - Role definitions for RBAC
-- ============================================================================
CREATE TABLE cd_roles (
    k_roles             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    description         TEXT,
    is_system           BOOLEAN NOT NULL DEFAULT false,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_roles IS 'Role definitions for role-based access control.';

-- ============================================================================
-- CD_FUNCTIONS - Function/permission definitions
-- ============================================================================
CREATE TABLE cd_functions (
    k_functions         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    function_type       VARCHAR(50),            -- crud, workflow, report, export, etc.
    description         TEXT,
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_functions IS 'Function/permission definitions that can be assigned to roles.';

-- ============================================================================
-- CD_TRANSLATIONS - Multi-language support
-- ============================================================================
CREATE TABLE cd_translations (
    k_translations      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code       VARCHAR(10) NOT NULL,    -- nl, en, de, fr, etc.
    translation_key     VARCHAR(500) NOT NULL,
    translation_value   TEXT NOT NULL,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_translations IS 'Multi-language translations for all UI labels, field names, etc.';

CREATE UNIQUE INDEX idx_translations_key_lang ON cd_translations(language_code, translation_key);

-- ============================================================================
-- CD_DICTIONARYCOMPONENTS - Reusable dictionary building blocks
-- ============================================================================
CREATE TABLE cd_dictionarycomponents (
    k_dictionarycomponents UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    alias               VARCHAR(100),
    component_type      VARCHAR(50),            -- field_template, form_template, table_template
    definition_json     JSONB NOT NULL,
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_lifestatus        life_status NOT NULL DEFAULT 'active',
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cd_dictionarycomponents IS 'Reusable dictionary building blocks/templates for creating new tables, forms, or field sets.';


-- ============================================================================
-- LINK TABLES (N:N relationships between CD_ entities)
-- Based on the blue matrix from the architecture diagram
-- ============================================================================

-- DICT_DATA: CD_DICTIONARIES <-> CD_DATABASES
CREATE TABLE cd_dict_data (
    k_dict              UUID NOT NULL REFERENCES cd_dictionaries(k_dictionaries),
    k_data              UUID NOT NULL REFERENCES cd_databases(k_databases),
    k_seq               UUID DEFAULT gen_random_uuid(),
    main                BOOLEAN DEFAULT false,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_dict, k_data)
);

-- TABL_FIEL: CD_TABLES <-> CD_FIELDS (also 1:N via FK, but link for flexibility)
CREATE TABLE cd_tabl_fiel (
    k_tabl              UUID NOT NULL REFERENCES cd_tables(k_tables),
    k_fiel              UUID NOT NULL REFERENCES cd_fields(k_fields),
    k_seq               UUID DEFAULT gen_random_uuid(),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_tabl, k_fiel)
);

-- FIEL_CONT: CD_FIELDS <-> CD_CONTROLS
CREATE TABLE cd_fiel_cont (
    k_fiel              UUID NOT NULL REFERENCES cd_fields(k_fields),
    k_cont              UUID NOT NULL REFERENCES cd_controls(k_controls),
    k_seq               UUID DEFAULT gen_random_uuid(),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_fiel, k_cont)
);

-- FORM_CONT: CD_FORMS <-> CD_CONTROLS
CREATE TABLE cd_form_cont (
    k_form              UUID NOT NULL REFERENCES cd_forms(k_forms),
    k_cont              UUID NOT NULL REFERENCES cd_controls(k_controls),
    k_seq               UUID DEFAULT gen_random_uuid(),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_form, k_cont)
);

-- TABL_FORM: CD_TABLES <-> CD_FORMS
CREATE TABLE cd_tabl_form (
    k_tabl              UUID NOT NULL REFERENCES cd_tables(k_tables),
    k_form              UUID NOT NULL REFERENCES cd_forms(k_forms),
    k_seq               UUID DEFAULT gen_random_uuid(),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_tabl, k_form)
);

-- TYPE_TABL: CD_TYPES <-> CD_TABLES
CREATE TABLE cd_type_tabl (
    k_type              UUID NOT NULL REFERENCES cd_types(k_types),
    k_tabl              UUID NOT NULL REFERENCES cd_tables(k_tables),
    k_seq               UUID DEFAULT gen_random_uuid(),
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_type, k_tabl)
);

-- ROLE_FUNC: CD_ROLES <-> CD_FUNCTIONS
CREATE TABLE cd_role_func (
    k_role              UUID NOT NULL REFERENCES cd_roles(k_roles),
    k_func              UUID NOT NULL REFERENCES cd_functions(k_functions),
    k_seq               UUID DEFAULT gen_random_uuid(),
    can_create          BOOLEAN DEFAULT false,
    can_read            BOOLEAN DEFAULT true,
    can_update          BOOLEAN DEFAULT false,
    can_delete          BOOLEAN DEFAULT false,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_role, k_func)
);

-- CANV_TABL: CD_CANVASES <-> CD_TABLES
CREATE TABLE cd_canv_tabl (
    k_canv              UUID NOT NULL REFERENCES cd_canvases(k_canvases),
    k_tabl              UUID NOT NULL REFERENCES cd_tables(k_tables),
    k_seq               UUID DEFAULT gen_random_uuid(),
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_canv, k_tabl)
);

-- LIFE_TABL: CD_LIFESTATUSES <-> CD_TABLES
CREATE TABLE cd_life_tabl (
    k_life              UUID NOT NULL REFERENCES cd_lifestatuses(k_lifestatuses),
    k_tabl              UUID NOT NULL REFERENCES cd_tables(k_tables),
    k_seq               UUID DEFAULT gen_random_uuid(),
    is_default          BOOLEAN DEFAULT false,
    sort_order          INTEGER DEFAULT 0,
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_life, k_tabl)
);

-- CANV_FUNC: CD_CANVASES <-> CD_FUNCTIONS
CREATE TABLE cd_canv_func (
    k_canv              UUID NOT NULL REFERENCES cd_canvases(k_canvases),
    k_func              UUID NOT NULL REFERENCES cd_functions(k_functions),
    k_seq               UUID DEFAULT gen_random_uuid(),
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_canv, k_func)
);

-- DICT_COMP: CD_DICTIONARIES <-> CD_DICTIONARYCOMPONENTS
CREATE TABLE cd_dict_comp (
    k_dict              UUID NOT NULL REFERENCES cd_dictionaries(k_dictionaries),
    k_comp              UUID NOT NULL REFERENCES cd_dictionarycomponents(k_dictionarycomponents),
    k_seq               UUID DEFAULT gen_random_uuid(),
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_dict, k_comp)
);

-- FUNC_COMP: CD_FUNCTIONS <-> CD_DICTIONARYCOMPONENTS
CREATE TABLE cd_func_comp (
    k_func              UUID NOT NULL REFERENCES cd_functions(k_functions),
    k_comp              UUID NOT NULL REFERENCES cd_dictionarycomponents(k_dictionarycomponents),
    k_seq               UUID DEFAULT gen_random_uuid(),
    memo                TEXT,
    f_createdby         UUID,
    createdate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    f_changedby         UUID,
    changedate          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (k_func, k_comp)
);


-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- CD_DATABASES
CREATE INDEX idx_databases_dictionary ON cd_databases(k_dictionaries);

-- CD_TABLES
CREATE INDEX idx_tables_database ON cd_tables(k_databases);
CREATE INDEX idx_tables_type ON cd_tables(table_type);
CREATE INDEX idx_tables_prefix ON cd_tables(prefix_4);

-- CD_FIELDS
CREATE INDEX idx_fields_table ON cd_fields(k_tables);
CREATE INDEX idx_fields_group ON cd_fields(field_group);
CREATE INDEX idx_fields_fk_table ON cd_fields(fk_table) WHERE fk_table IS NOT NULL;

-- CD_CONTROLS
CREATE INDEX idx_controls_field ON cd_controls(k_fields);
CREATE INDEX idx_controls_lookup ON cd_controls(lookup_table) WHERE lookup_table IS NOT NULL;

-- CD_FORMS
CREATE INDEX idx_forms_table ON cd_forms(k_tables);

-- CD_TYPES
CREATE INDEX idx_types_table ON cd_types(k_tables);

-- CD_FOLDERS
CREATE INDEX idx_folders_parent ON cd_folders(k_seq) WHERE k_seq IS NOT NULL;

-- CD_LIFESTATUSES
CREATE INDEX idx_lifestatuses_table ON cd_lifestatuses(k_tables) WHERE k_tables IS NOT NULL;
