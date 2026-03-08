# MetalSpheeres — Project Documentation

> **Read this FIRST before making any changes.**

## 1. Overview

MetalSpheeres is a production management SaaS for manufacturing companies.
Single-page app: one HTML file + Node.js backend.

| Item | Value |
|------|-------|
| Frontend | `metalspheeres-app.html` (~5550 lines, HTML + CSS + JS) |
| Backend | `server.js` (~1690 lines, Node.js/Express) |
| Database | PostgreSQL on Neon (cloud) |
| Hosting | Render.com free tier, auto-deploy from GitHub `main` |
| URL | https://spheeres.onrender.com |
| Repo | https://github.com/ErikStolk67/Spheeres |

### 1.1 File Structure

```
metalspheeres-app.html  — Single-page app (ALL frontend code)
server.js               — Express API server
package.json            — Dependencies (express, pg, adm-zip, cors)
database/
  003_xsd_migration.sql — Table DDL (original schema)
  004_xsd_alignment.sql — ALTER TABLE additions
  migrations/           — Older migration files
PROJECTDOC.md           — THIS FILE (read it!)
README.md               — Brief overview
```

### 1.2 Deployment

- Push to `main` → auto-deploy on Render (2-3 min)
- Render free tier: server sleeps after inactivity, cold start 30-60s
- GitHub PAT stored in Claude memory for push

### 1.3 Network Access

Claude's environment **cannot reach** spheeres.onrender.com (blocked by proxy).
This means: **no live API testing possible**. All changes must be verified by syntax
checking and logical reasoning. Ask the user to add it to allowed domains if needed.

---

## 2. Database Architecture

### 2.1 Dictionary-Driven (Metadata-Driven)

All database structures are self-describing via `cd_tables` and `cd_fields`.

**cd_tables** key columns:

| Column | Type | Purpose |
|--------|------|---------|
| k_table | integer | Primary key |
| name | varchar | Table name (e.g. "CD_FIELDS", "SYS_USERS", "CONTACTS") |
| f_type | integer | Table classification (see 2.3) |
| sort | varchar(500) | Display order in designer matrix |

> ⚠️ **CRITICAL**: The `sort` column is **varchar(500)**, not integer!
> The migration (003) creates it as integer, but `004_xsd_alignment.sql` alters it to varchar.
> Always use `parseInt()` when reading. Never use `typeof r.sort === 'number'`.
> Do NOT try to ALTER the column or CAST in queries. Just read the string and parseInt.

### 2.2 Table Groups (3 zones)

| Prefix | Zone | Description |
|--------|------|-------------|
| `CD_` | Dictionary | Metadata tables describing the data model |
| `SYS_` | System | Application infrastructure (users, sessions, queues) |
| *(none)* | User | Business data entities (Contacts, Companies, Projects) |

### 2.3 Four Table Types (f_type)

| f_type | Type | Naming Pattern | Example |
|--------|------|----------------|---------|
| 1 | Entity | No `_` in base name | `CD_FIELDS`, `CONTACTS` |
| 2 | Lookup | `LK_` prefix | `CD_LK_KINDS`, `LK_COUNTRIES` |
| 3 | Link | Two 4-letter entity prefixes joined by `_` | `CD_TABL_FIEL`, `CONT_COMP` |
| 4 | Subtable | `$` separator or prefix + `_` + suffix | `CONT$ADDRESSES` |
| 5 | Sys Entity | `SYS_` + single word | `SYS_USERS`, `SYS_LOCKS` |

### 2.4 Link Table Conventions

Link tables connect two entities via 4-letter abbreviations:
- `CD_TABL_FIEL` = CD_TABLES ↔ CD_FIELDS
- `CONT_COMP` = CONTACTS ↔ COMPANIES

**Matrix rules:**
- Each link table produces: `n` at [from, to] AND `—` at [to, from]
- Self-links (e.g. `CD_FIEL_FIEL`) produce `nn` on the diagonal
- Count of `n` cells = count of `—` cells (always paired)
- Total link tables = nn count + n count

### 2.5 Field Groups (column ordering)

| Group | Name | Description |
|-------|------|-------------|
| H | Header | System keys, type, main flag |
| OH | Optional Header | Name and other optional identifiers |
| C | Custom | Tenant-defined custom fields |
| OF | Optional Footer | Memo field |
| F | Footer | Audit trail: lifestatus, owner, created/changed by/date |

### 2.6 Standard Field Template per Table Type

Each table type has a standard set of fields. When creating/seeding tables, these fields must be present:

| Group | Field | Entity | Link | Sub | Lookup |
|-------|-------|--------|------|-----|--------|
| H | Key | K_\<entityname\> | K_\<4chars_A\> | K_\<entityname\> | K_\<lookupname\> |
| H | Key 2 | | K_\<4chars_B\> | | |
| H | Key optional | | K_SEQ | K_SEQ | K_SEQ |
| H | Keys optional | | K_\<optional\> | | |
| H | Alias per type | Alias | | | |
| H | Type | | F_Type | | |
| OH | Main | | Main | | |
| OH | Name | Name | | | Name |
| C | *(custom)* | | | | |
| OF | Memo | Memo | Memo | Memo | |
| F | F_LifeStatus | F_LifeStatus | | | |
| F | Owner | F_Owner | | | |
| F | CreatedBy | F_CreatedBy | F_CreatedBy | F_CreatedBy | F_CreatedBy |
| F | CreateDate | CreateDate | CreateDate | CreateDate | CreateDate |
| F | ChangedBy | F_ChangedBy | F_ChangedBy | F_ChangedBy | F_ChangedBy |
| F | ChangeDate | ChangeDate | ChangeDate | ChangeDate | ChangeDate |

**Key naming conventions:**
- Entity: `K_<ENTITYNAME>` (e.g. K_TABLE, K_FIELD)
- Link: `K_<4CHAR_A>` + `K_<4CHAR_B>` (e.g. K_TABL + K_FIEL)
- Sub: `K_<PARENT_ENTITY>` (foreign key to parent)
- Lookup: `K_<LOOKUPNAME>` (e.g. K_COUNTRY)

**Footer fields** (F_CreatedBy, CreateDate, F_ChangedBy, ChangeDate) are present on ALL table types.
**F_LifeStatus and F_Owner** are only on Entity tables.
**F_Type** is only on Link tables (references cd_types).

---

## 3. Database Designer (Matrix)

### 3.1 What It Shows

A **cross-matrix** with entities on BOTH axes. Only entities appear (not links, subs, or lookups). Cells show relationships detected from link tables.

### 3.2 Cell Values

| Value | Meaning | Color (CD) | Color (SYS×SYS) | Color (all other) |
|-------|---------|-----------|-----------------|---------------|
| `nn` | Self-link (diagonal) | #1D4ED8 dark blue | #D97706 amber | #64748B dark gray |
| `n` | Link from row→col | #3B82F6 blue | #FBBF24 yellow | #94A3B8 gray |
| `—` | Reciprocal of n | #93C5FD light blue | #FDE68A light yellow | #CBD5E1 light gray |
| empty | No relationship | #DBEAFE | #FEF9C3 | #F1F5F9 |
| diagonal (no link) | Self | #BFDBFE | #FDE68A | #E2E8F0 |

### 3.3 Color Zones — READ CAREFULLY

**CD Designer**: One zone — everything blue.

**User Designer**: Two zones ONLY:
- **SYS×SYS** (BOTH row AND column entity are SYS_): yellow/amber
- **Everything else** (any cell where at least one entity is NOT SYS_): **GRAY**

> ⚠️ There is NO separate "User×User" zone or "Cross" zone. Only SYS×SYS is yellow.
> All other combinations (SYS×User, User×SYS, User×User) are GRAY. This was
> fixed multiple times — do not introduce a third zone again.

### 3.4 Header Styling

- **Row headers**: Light gray background (#FAFBFC), NOT zone-colored
- **Column headers**: Light gray background (#F8FAFC), NOT zone-colored
- **Column text**: Rotated (writing-mode: vertical-lr, transform: rotate(180deg)), left-aligned at bottom, height 150px
- **Meta columns**: Same light background as row header
- Only **matrix cells** have zone colors. Headers and entity names are NEVER colored.

### 3.5 Meta Columns

| Column | Content | Source |
|--------|---------|--------|
| Type | Number of types per entity | `GET /api/types/counts` (counts from cd_types table) |
| Sub | Number of subtables | Counted from schema detection |
| Screens | Number of screens | TBD |

### 3.6 Entity Ordering (Sort)

- Entities are ordered by the `sort` field in `cd_tables`
- The `sort` field is **varchar** storing numeric strings ("10", "20", ...)
- Frontend reads via `parseInt(r.sort, 10)`, fallback 9999 if NaN
- In User Designer: SYS_ entities always first (groupOrder=0), then User (groupOrder=1), each sub-group sorted by `sort`
- Sorting only applies when `_cdTablesSortOrder` has data (avoid flash of unsorted content)

### 3.7 Drag & Drop Reordering

- **Drag row headers** (entity names on the left) to reorder
- Column order follows automatically (same entity list on both axes)
- On drop: assigns new sort values (10, 20, 30...) and saves via `PUT /api/tables/sort`
- Request body: `{ order: [{ name: "CD_TABLES", sort: 10 }, ...] }`
- Server updates `cd_tables SET sort = $1 WHERE UPPER(name) = UPPER($2)`
- Visual: dragged row fades to 40% opacity, blue border-top shows insertion point
- Column headers are NOT draggable (rotated CSS breaks browser drag events)
- Works identically in both CD and User designers

### 3.8 Features NOT Present (by design)

- No legend bar
- No search/filter fields
- No column header dragging
- No F_ column scanning for relationships

---

## 4. Link Detection Algorithm

### 4.1 Prefix Map (CRITICAL — Many bugs were caused here)

The prefix map is built from **entities only**, sorted by **name length (shortest first)**:

```
CD_ROLES (short) claims ROLE, ROL
CD_FIELDS claims FIEL, FIE
CD_DICTIONARIES claims DICT, DIC  ← gets priority over DICTIONARYCOMPONENTS!
CD_DICTIONARYCOMPARISONS → DICT already taken, so no 4-char prefix for this one
```

If entities are NOT sorted by length, DICTIONARYCOMPONENTS overwrites DICTIONARIES
for the DICT prefix, and CD_DICT_TABL incorrectly links to DICTIONARYCOMPONENTS.

**Additional abbreviation aliases** (hardcoded because they don't follow the 4-char rule):
- `CNTR` → same as `CONT` (for CD_FIEL_CNTR → CD_FIELDS ↔ CD_CONTROLS)
- `DICO` → same as `DICT` (for CD_DICO_DICO → CD_DICTIONARIES self-link)
- `DATA` → CD_DATABASES (for CD_DATA_FIEL, CD_DATA_CONT)

### 4.2 Table Sources

Tables come from TWO sources (union):
- `xsdFieldData` — loaded from XSD seed / import
- `window._schemaFull` — live database schema from `/api/schema/full`

Both must be checked, otherwise tables present in the DB but not in the XSD (like CD_CANVASES) will be missing from the designer.

### 4.3 Classification Order

For tables with `_` in base name, check in this EXACT order:
1. Both parts match **different** entities → **Link table**
2. Both parts match **same** entity → **Self-link** (nn on diagonal)
3. Only first part matches → **Subtable**

> ⚠️ Self-link check (step 2) MUST come BEFORE sub check (step 3).
> If reversed, CD_DICO_DICO gets classified as subtable of CD_DICTIONARIES
> instead of self-link. This bug was fixed in v0.7.2.

### 4.4 Expected CD Link Count

CD Designer should show **24 link tables** (verified v0.7.9):

**6 self-links (nn on diagonal):**
TRAN_TRAN, DICO_DICO, FIEL_FIEL, FORM_FORM, FUNC_FUNC, ROLE_ROLE

**18 cross-links (n + — pair each):**
CANV_CONT, CANV_FUNC, CANV_LIFE, CONT_FIEL, CONT_FORM, DATA_CONT,
DATA_FIEL, DICT_TABL, FIEL_CNTR, FORM_CONT, LIFE_CANV, LIFE_LICE,
ROLE_CANV, TABL_CONT, TABL_FIEL, TABL_FORM, TABL_TYPE, TYPE_FOLD

If the statistics page says 24 links but the matrix shows fewer, the prefix map is wrong.

---

## 5. API Endpoints

### 5.1 Schema & Tables

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/schema/full` | GET | Full PostgreSQL schema (tables, columns, types) |
| `/api/tables` | GET | All cd_tables rows ORDER BY sort |
| `/api/tables/sort` | PUT | Bulk update sort: `{ order: [{name, sort}] }` |
| `/api/tables/:id/fields` | GET | Fields for a table |
| `/api/fields` | GET | All fields joined with tables |
| `/api/tables/:id/types` | GET/POST | Types for a table (uses f_table, not k_table) |
| `/api/types/:id` | PUT/DELETE | Update or delete a type in cd_types |
| `/api/types/counts` | GET | Type count per entity via cd_types JOIN cd_tables |
| `/api/entity-types/:entityName` | GET | Types for entity by name: resolves name→k_table→cd_types |

### 5.2 Data & Stats

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/stats/counts` | GET | Record counts per table |
| `/api/raw/:table?limit=&offset=&search=` | GET | Raw table data, paginated. Search queries ALL text/varchar columns with ILIKE |
| `/api/data/:table` | POST | Insert/update data |
| `/api/tables/sort/init` | POST | Fill NULL sort values in cd_tables with contiguous numbers |
| `/api/backup` | GET | Export all CD_ table data as JSON |

### 5.3 Import & Export

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/import-xml` | POST | Import XML data into existing tables (async, non-blocking) |
| `/api/import-status` | GET | Live import progress polling |
| `/api/import-schema` | POST | Import Verspaning-style schema XML |
| `/api/seed` | POST | Seed dictionary |
| `/api/seed-xsd` | POST | Seed from XSD field data |
| `/api/build-tables` | POST | Create PostgreSQL tables from dictionary |
| `/api/restore-cd-tables` | POST | Restore cd_tables from PostgreSQL catalog (emergency recovery) |

### 5.4 Debug

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/debug/errors` | GET | Import status, last 20 errors, memory usage in MB |

### 5.5 Import System (XML/ZIP)

**Architecture: client-side unzip + server-side async**

1. Frontend detects ZIP → uses JSZip (CDN) to extract XML files in browser
2. Each XML file sent individually to `/api/import-xml` (keeps server memory low)
3. Server responds immediately with `{success: true, message: 'Import started'}`
4. Import runs in background, updates `_importStatus` with progress
5. Frontend polls `/api/import-status` every 1s, shows status bar (bottom-right, non-blocking)
6. On completion, import report shows per-table results

**Critical: NO TRUNCATE.** Import uses UPSERT (ON CONFLICT DO UPDATE) to prevent data loss if interrupted.

**k_table mapping issue:** cd_types.f_table contains original production k_table values (e.g. 20166, 19722). cd_tables.k_table may have different values from XSD seed (1, 2, 3...). After ZIP import, cd_tables gets the original k_table values, and the JOIN works correctly.

**Startup health check:** On server start, checks if cd_tables is empty and logs a warning. Does NOT auto-seed (was causing boot crashes). Use `POST /api/restore-cd-tables` for manual recovery.

---

## 6. Frontend Data Flow

### 6.1 Key Functions

| Function | Purpose |
|----------|---------|
| `buildCdSchema()` | Classifies CD_ tables into entities/links/subs/lookups via prefix matching |
| `buildUserSchema()` | Same pattern as buildCdSchema but for SYS_ and User tables |
| `renderDbDesigner()` | Renders the matrix for both CD and User designers |
| `renderDbStatistics()` | Renders statistics cards with table counts |
| `applySchema()` | Applies loaded schema data, fires table/type fetches, triggers cache invalidation |
| `loadSchemaFromDB()` | Entry point: loads from sessionStorage cache, then fetches fresh from API |
| `handleColDrop()` | Drag & drop handler: reorders columns within block, saves contiguous sort |
| `renderFormDesigner()` | Form Designer screen with toolbox, preview, tabs |
| `fdRenderToolbox()` | Builds toolbox: subject fields, subtables, linked entities |
| `fdRenderPreview()` | Builds form preview: toolbar, header area, tabs |
| `renderLookupEditor()` | Lookup Editor with categorized tree |
| `getCdLookupMap()` | Builds lookup tree: entities→lookups, sorted by zone |
| `showRawData(tableName)` | Raw data popup with pagination (50/page) |
| `openSearchScreen(table, cb)` | Record search overlay for a specific table |
| `openEntitySearch()` | Entity/table name search overlay |
| `openGlobalSearch()` | Context-aware: routes to correct search per active designer |

### 6.3 Startup Sequence

1. Page loads → `loadSchemaFromDB()`
2. Check sessionStorage cache → if found, `applySchema(cached)` immediately
3. Fetch `/api/schema/full` → `applySchema(fresh)` on response
4. `applySchema()` populates `xsdFieldData` and `_schemaFull`
5. `applySchema()` fetches `/api/tables` → populates `_cdTablesMap` + `_cdTablesSortOrder`
6. Chained: fetches `/api/types/counts` → populates `_typeCounts`
7. Then: `invalidateCdSchema()` + `invalidateUserSchema()` + `renderContent()`

### 6.4 Schema Caching

| Cache | Builder | Invalidator |
|-------|---------|-------------|
| `_cdSchema` | `buildCdSchema()` via `getCdSchema()` | `invalidateCdSchema()` |
| `_userSchema` | `buildUserSchema()` via `getUserSchema()` | `invalidateUserSchema()` |

Accessors: `getCdTables()`, `getCdRelations()`, `getDbTables()`, `getUserRelations()`, etc.

### 6.5 Global State

| Variable | Content | Set by |
|----------|---------|--------|
| `xsdFieldData` | `{ "CD_TABLES": "K_TABLE:i,NAME:s,..." }` | `applySchema()` |
| `window._schemaFull` | Full schema object | `applySchema()` |
| `window._cdTablesMap` | `{ "CD_TABLES": 1 }` f_type per table | fetch `/api/tables` |
| `window._cdTablesSortOrder` | `{ "CD_TABLES": 4 }` sort (parseInt'd) | fetch `/api/tables` |
| `window._typeCounts` | `{ "CD_TABLES": 2 }` type count | fetch `/api/types/counts` |

---

## 7. Statistics Page

Categorizes ALL tables (not just entities) into zones and types.

**Classification rules** (same for all zones):
1. `$` in name → subtable
2. `_LK_` in name or base starts with `LK_` → lookup
3. Base has exactly 2 parts of exactly 4 letters each → link table (e.g. CD_TABL_FIEL, CD_TYPE_TYPE)
4. Base has 2 parts where at least one is more than 4 letters → subtable (e.g. CD_TABL_TABSETTINGS, CD_FIEL_FIELDVALUE)

Note: the 4-letter abbreviations generally correspond to entity names (TABL=TABLES, FIEL=FIELDS, TYPE=TYPES). Exceptions exist where 4 letters would cause duplicates (e.g. PRPL=PLANNING).
4. Base has `_` (other) → subtable
5. No `_` in base → entity

Statistics cards sort **alphabetically** within each category.

**Statistics card interactions:**
- Click table name → alert "Klik op Records of Fields"
- Click record count → `showRawData()` popup with paginated data (50/page)
- Click field count → `showTablePopup()` with field definitions

**Type column:** Shows `COUNT(DISTINCT f_type)` from the actual table data (not cd_types). Only counts tables that have an f_type column.

### 7.1 Raw Data Popup

`showRawData(tableName)` opens a paginated data viewer:
- 50 records per page
- Clickable page numbers (1 2 3 … 178 179 180)
- First/prev/next/last buttons
- Sticky header row
- NULL values shown in light gray
- Total record count in title

### 7.2 Lookup Editor

Tree structure sorted in 8 categories:
1. CD Entities → their LK_ lookups
2. CD Subtables → their LK_ lookups
3. SYS Entities → their LK_ lookups
4. SYS Subtables → their LK_ lookups
5. User Entities → their LK_ lookups
6. User Subtables → their LK_ lookups
7. Connected Lookups — LK_ tables with F_ columns pointing to other LK_ tables
8. Unrelated — LK_ tables not referenced by any non-lookup table

Only **LK_ tables** appear as children. Entities/subs/links never appear as children.

`getCdLookupMap()` scans ALL tables (not just CD) for F_ columns and matches to LK_ tables.

---

## 8. CSS Classes & Styling Details

### 8.1 Matrix Cell CSS Classes

| Class | Zone | Value | Background |
|-------|------|-------|------------|
| `cell-nn-cd` | CD | nn | #1D4ED8 (dark blue) |
| `cell-n-cd` | CD | n | #3B82F6 (blue) |
| `cell-dash-cd` | CD | — | #93C5FD (light blue) |
| `cell-nn` | SYS×SYS | nn | #D97706 (amber) |
| `cell-n` | SYS×SYS | n | #FBBF24 (yellow) |
| `cell-dash` | SYS×SYS | — | #FDE68A (light yellow) |
| `cell-nn-user` | other | nn | #64748B (dark gray) |
| `cell-n-user` | other | n | #94A3B8 (gray) |
| `cell-dash-user` | other | — | #CBD5E1 (light gray) |

### 8.2 Matrix Gridlines

All matrix cells have `border-right: 2px solid #fff; border-bottom: 2px solid #fff` — white gridlines separating cells on the colored backgrounds.

### 8.3 Icons

- **Lucide** icons v0.263.1 (CDN) — used for sidebar, entity icons, toolbars
- **FontAwesome** 6.5.1 (CDN) — used for search screen, form designer buttons
- `cdIconMap`: maps CD entity base names to Lucide icons (e.g. 'FIELDS':'list')
- `userIconMap`: maps SYS/User entity names to Lucide icons (e.g. 'SYS_USERS':'users')
- Fallback stub if Lucide CDN fails
- Icon viewer pages in Dictionary menu: Lucide Icons + FontAwesome Icons (click to copy)

### 8.4 Designer Toggle

- `designerMode` variable: `'user'` or `'dictionary'`
- Persisted in `sessionStorage('ms_designerMode')`
- Toggle buttons: `.active-user` (gray #64748B) and `.active-dict` (blue #3B82F6)

---

## 9. Screens & Navigation

| Screen | Function | Trigger |
|--------|----------|---------|
| Dashboard | `renderDashboard()` | Click home / `navigate(null)` |
| Database Designer | `renderDbDesigner()` | Click "Database Designer" menu item |
| Database Statistics | `renderDbStatistics()` | Click "Statistics" menu item |
| Dictionary Screen | `renderDictionaryScreen(item, group)` | Click CD_ item in sidebar |
| Entity Screen | `renderEntityScreen(item, group)` | Click entity item in sidebar |
| Entity Popup | `showTablePopup(tableName)` | Click entity name in matrix |
| Raw Data Popup | `showRawData(tableName)` | Click record count in statistics |
| Form Designer | `renderFormDesigner()` | Click "Form Designer" menu item |
| Lookup Editor | `renderLookupEditor()` | Click "Lookup Editor" menu item |
| Lucide Icons | `renderLucideIcons()` | Click "Lucide Icons" menu item |
| FontAwesome Icons | `renderFontAwesomeIcons()` | Click "FontAwesome Icons" menu item |
| Search Screen | `openSearchScreen(table, callback)` | Click search bar on any screen |
| Entity Search | `openEntitySearch()` | ⌘K / Ctrl+K (default) |

### 9.1 Sidebar Menu Structure

**Primary** — Business entities (Contacts, Companies, Projects, etc.)
**System** — SYS_ tables (Users, Logs, Sessions, etc.)
**Dictionary** — CD_ metadata tables + Database Statistics + Icon viewers
**Designers** (in order):
1. Database Designer, 2. Workflow Designer, 3. Form Designer,
4. Network Designer, 5. Field Collection Designer, 6. Data Wizard,
7. Function Designer, 8. SBI Designer, 9. Lookup Editor, 10. Translations
**Resources** — Template Designer

### 9.2 Search System

Two search modes, triggered by context:

| Mode | Trigger | Searches | Result action |
|------|---------|----------|---------------|
| Entity search | ⌘K on non-designer screens | All table names in schema | Navigate to Form Designer |
| Record search | ⌘K on designers, or click search bar | Records in specific CD table | Callback per designer |

Designer → CD table mapping:
- Form Designer → `cd_forms`
- Workflow Designer → `cd_canvases`
- Function Designer → `cd_functions`
- Lookup Editor → `cd_tables`
- Translations → `cd_translations`

`openGlobalSearch()` reads `activeItem` and routes to the correct search mode.

Navigation: `activeItem` stored in sessionStorage, sidebar highlights active item.

---

## 10. User Schema Entity Detection

In `buildUserSchema()`, entities from the live schema (`_schemaFull`) are classified:
- Name starts with `SYS_` and has no further `_` → `type: 'sys'`
- Name starts with `SYS_` but has `_` in remainder → subtable/link (not entity)
- Name has no `_` at all → `type: 'user'` (business entity)
- Name starts with `LK_` → lookup (not entity)

This determines which zone each entity belongs to in the User Designer matrix.

---

## 11. Dependencies

```json
{
  "express": "^5.2.1",
  "pg": "^8.19.0",
  "cors": "^2.8.6",
  "adm-zip": "^0.5.16"
}
```

Frontend: Lucide Icons v0.263.1 (CDN), FontAwesome 6.5.1 (CDN), no build step, no framework.

### 11.1 FontAwesome Icon Classes

Usage: `<i class="fa-solid fa-house"></i>` or `<i class="fa-regular fa-file"></i>`

| Category | Icons |
|----------|-------|
| Navigation | `fa-house`, `fa-bars`, `fa-arrow-left`, `fa-arrow-right`, `fa-chevron-down`, `fa-chevron-up`, `fa-xmark` |
| Actions | `fa-plus`, `fa-pen`, `fa-trash`, `fa-copy`, `fa-download`, `fa-upload`, `fa-save`, `fa-rotate` |
| Objects | `fa-file`, `fa-folder`, `fa-database`, `fa-table`, `fa-list`, `fa-grid`, `fa-image`, `fa-link` |
| Users | `fa-user`, `fa-users`, `fa-building`, `fa-address-book`, `fa-id-card` |
| Status | `fa-check`, `fa-circle-check`, `fa-circle-xmark`, `fa-triangle-exclamation`, `fa-circle-info` |
| Design | `fa-palette`, `fa-pen-ruler`, `fa-wand-magic-sparkles`, `fa-layer-group`, `fa-puzzle-piece` |
| Data | `fa-chart-bar`, `fa-chart-line`, `fa-filter`, `fa-sort`, `fa-magnifying-glass` |
| Communication | `fa-envelope`, `fa-phone`, `fa-comment`, `fa-bell` |
| Business | `fa-briefcase`, `fa-cart-shopping`, `fa-money-bill`, `fa-handshake`, `fa-bullseye` |
| Misc | `fa-gear`, `fa-lock`, `fa-key`, `fa-shield`, `fa-code`, `fa-terminal`, `fa-globe`, `fa-calendar` |

Styles: `fa-solid` (filled), `fa-regular` (outline), `fa-light`, `fa-brands`
Sizing: `fa-xs`, `fa-sm`, `fa-lg`, `fa-xl`, `fa-2xl`
Colors: Use inline style `style="color:#3B82F6;"`

---

## 12. Form Designer

### 12.1 Overview

The Form Designer builds consult screens for entities. It shows a **toolbox** on the left, a **form preview** in the center, and **tabs** at the bottom for linked entities.

### 12.2 Database Tables

| Table | Purpose |
|-------|---------|
| `cd_forms` | Screen definitions (k_form, f_type, name, f_kind, f_template) |
| `cd_tabl_form` | Links tables to forms (k_form → k_tabl, main, tabletype, f_fieldcollection) |
| `cd_form_cntr` | Links controls to forms (k_form → k_cntr, k_seq for ordering) |
| `cd_form_form` | Links forms to other forms (k_form1 → k_form2) |
| `cd_canvases` | Canvas/screen elements (k_canvas, f_type, name, xposition, yposition, size) |

### 12.3 Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Form Designer    [Search...] [icons]                        │
├──────────┬──────────────────────────────────────────────────┤
│ Toolbox  │ COMPANIES ✏  Entity type [-▾] Screen [Consult▾] │
│          │  Field Collection [User▾] ⚙                      │
│ Entities │┌────────────────────────────────────────────────┐│
│ ┌──────┐ ││ [Search] ★ +Add ✏Edit 🗑Delete ≡List ↺History ││
│ │COMP. │ ││                                          🏛    ││
│ │Sub1:1│ ││ ┌─────────┬──────────────┬────────────────┐   ││
│ │Fields│ ││ │Avatar   │Company name  │VAT number      │   ││
│ │  ... │ ││ │Logo     │RONALD RONALD │Last VIES...    │   ││
│ │      │ ││ │Drop doc │Phone  +31... │Paymentcondition│   ││
│ └──────┘ ││ │         │email  info@  │Supply conditions│  ││
│ $SUBKEYS ││ │         │Website www   │                │   ││
│ $COMP... ││ └─────────┴──────────────┴────────────────┘   ││
│ $LICENS  ││                                                ││
│ Companies││ Contacten Actions Bedrijven Adressen ...  +    ││
│ Actions  ││┌──────────────────────────────────────────────┐││
│ Contacts │││ Contacts.Full name                           │││
│ Projects │││ Contacts.Contact name                        │││
│ Cases    │││ Contacts.Picture                             │││
│ Opport.  │││ Contacts.Birthday                            │││
│ Agenda   │││ ...                                          │││
│          ││└──────────────────────────────────────────────┘││
│          │└────────────────────────────────────────────────┘│
└──────────┴──────────────────────────────────────────────────┘
```

### 12.4 Toolbox (Left Panel)

The toolbox shows the entity and all related tables:

**Top section — Subject entity:**
- Entity name (e.g. "COMPANIES") with icon
- Label "Subject 1:1" 
- All fields from the entity, sorted by SORT field
- Fields are color-coded by type:
  - **Green**: PKey (K_ fields)
  - **Orange/yellow**: Lookup (F_ fields referencing LK_ tables)
  - **Blue**: Text fields
  - **Purple**: Image fields
  - **Red**: DateTime fields
- Click on entity header → collapse/expand fields

**Middle section — Subtables:**
- $SUBKEYS, $COMPANYADDRESSES, $LICENSES, etc.
- Each with edit icon (✏)

**Bottom section — Linked entities:**
- All entities connected via link tables
- Each shows a link label:
  - "1:n" — link from subject to this entity
  - "1:main" — link where main=true
  - "n:1" — reverse link
- Click on header → collapse/expand that entity's fields

### 12.5 Form Preview (Center)

**Top bar:**
- Entity name with edit icon
- Entity type dropdown (from cd_types for this entity, always includes "-" default)
- Screen type dropdown (ConsultScreen, EditScreen, etc.)
- Field Collection dropdown (User, Admin, etc.)

**Toolbar:**
- Search, Star/favorite, +Add, Edit, Delete, List, History buttons

**Three-column header area:**
- Left: Avatar/logo, name fields, document drop zone
- Middle: Key fields (Phone, Fax, email, Website)
- Right: Additional fields (VAT number, Payment condition, etc.)
- Fields can be dragged here from the toolbox

**Bottom tabs:**
- One tab per linked entity + subtable
- Active tab shows field rows (gold/yellow color)
- Fields shown as "EntityName.FieldName"
- "+" tab to add new tab
- Tab order follows link table connections

### 12.6 Screen Types (F_TYPE) and CD_TYPES

The type system works as follows:

- **CD_TYPES** is the central lookup table for all F_TYPE values
- `cd_types.f_table` → FK to `cd_tables.k_table` — determines which entity the type belongs to
- `cd_types.f_type` → FK to `cd_types.k_type` — parent type (hierarchy)
- `cd_types.k_type` → PK, the value stored in F_TYPE columns of entity records
- `cd_types.flowfolder` → boolean, marks flow folder types
- `cd_types.memo_plaintext` → description text
- `cd_types.f_kind` → kind classification
- `cd_types.f_icon` → icon reference
- `cd_types.sort` → display order

To get types for entity "COMPANIES":
1. Find k_table: `SELECT k_table FROM cd_tables WHERE name = 'COMPANIES'` → e.g. 42
2. Get types: `SELECT * FROM cd_types WHERE f_table = 42`

API: `GET /api/entity-types/:entityName` returns `{ types: [...], k_table: N }`

**Type column in Database Designer matrix:**
- Shows count of types from cd_types for each entity
- Number in blue+bold when types exist, dash `–` when none
- Always clickable → opens Types Editor
- Count comes from `GET /api/types/counts` (JOIN cd_types on cd_tables)

### 12.7 Types Editor

Opens when clicking Type count in the matrix. Two-panel layout:

**Left panel — Tree:**
- Hierarchical tree of types for the entity
- Root types: f_type = 19181 (common root) or null
- Children: f_type points to parent's k_type, shown indented
- Drag & drop:
  - Up/down: reorder within same level
  - Right (>60px): make child of drop target
  - Blue indicators show drop position
  - Changes saved to API immediately (f_type updated)
- "+" button: creates new type (POST /api/tables/:k_table/types)
- Default "—" item always shown at top

**Right panel — Properties (General tab):**
- Name: editable, saved on Save
- Type: Entity type (dropdown)
- Kind: from f_kind
- Icon: icon selector
- Flow folder: checkbox (flowfolder field)
- Status: Enable/Disable
- Description: memo_plaintext

**Additional tabs (planned):**
- Status designer
- Business Roles
- Kinds
- Business Roles's Type Security

### 12.8 Link Labels in Toolbox

The link direction determines the label shown:

| Scenario | Label | Meaning |
|----------|-------|---------|
| Link table has subject as first entity | 1:n | Subject links to many of this entity |
| Link table has subject as second entity | n:1 | This entity links to many subjects |
| Link table has main=true | 1:main | Primary/main link |
| Both directions exist | Shows both labels | |

---

## 13. Known Issues & Gotchas

| # | Issue | Detail |
|---|-------|--------|
| 1 | **sort is varchar** | cd_tables.sort is varchar(500). Use parseInt(). Never typeof === 'number'. |
| 2 | **Prefix collisions** | DICT/DIC claimed by DICTIONARYCOMPONENTS if not sorted by length first. |
| 3 | **No API testing** | spheeres.onrender.com blocked from Claude's environment. |
| 4 | **Self-link order** | Self-link check must be BEFORE sub check or CD_DICO_DICO misclassifies. |
| 5 | **CD_CANVASES** | Only in live DB, not in XSD seed. Must union xsdFieldData + _schemaFull. |
| 6 | **CNTR abbreviation** | CD_FIEL_CNTR uses CNTR not CONT. Needs hardcoded alias in prefix map. |
| 7 | **Render cold start** | First request 30-60s. SessionStorage cache shows instant stale data. |
| 8 | **NULL sort values** | Many cd_tables rows have sort=NULL from imports. /api/tables/sort/init fixes this. |
| 9 | **cd_fields mostly NULL** | XSD import only sets name+type+sort. f_kind, f_format etc. need data export to fill. |
| 10 | **Headers must be WHITE** | Entity names on both axes: #fff. Meta columns: lighter than matrix. NOT zone-colored. |
| 11 | **Drag is column-based** | Drag on horizontal axis (column headers), NOT row headers. Within same block only. |
| 12 | **k_table mismatch** | cd_types.f_table has original production k_table values. cd_tables.k_table may differ after XSD seed. ZIP import fixes this by overwriting cd_tables with original PKs. |
| 13 | **Render OOM on large uploads** | Server crashes on 8MB+ files. ZIP must be extracted client-side (JSZip). Individual XMLs sent one at a time. |
| 14 | **No TRUNCATE in imports** | TRUNCATE was removed. Import uses UPSERT. If TRUNCATE is reintroduced, a crash mid-import will leave tables empty. |
| 15 | **Import status is per-file** | When importing a ZIP with multiple XMLs, _importStatus only shows the last file's result. Frontend merges results from all files. |
| 16 | **Express 5.x** | The project uses Express 5.2.1 (not v4). Some middleware patterns differ. |

---

## 14. Version History (key milestones)

| Version | Commit | Changes |
|---------|--------|---------|
| v0.6.2 | f06a369 | Original baseline, CD Designer working |
| v0.7.1 | 8875425 | Clean restart, User Designer, zone colors |
| v0.7.2 | 41ae4a4 | Self-link bug fix (CD_DICO_DICO), white gridlines |
| v0.7.9 | 3cae5a2 | Prefix map fix (24 links), parseInt sort, type counts |
| v0.8.0 | d1b8f51 | Drag & drop via row headers, saves sort |
| v0.8.1 | a3e1edb | parseInt fix for varchar sort column |
| v0.8.3 | e27a06e | User designer: only SYS×SYS yellow, all else gray |
| v0.8.5 | 314089e | WHITE headers, light meta columns, column drag |
| v0.8.6 | f71cc7f | Fix NULL sort values with /api/tables/sort/init |
| v0.8.7 | e5ab433 | Raw data pagination (500/page) |
| v0.8.8 | c03b511 | Type column: COUNT(DISTINCT f_type) in actual data |
| v0.8.9 | 83ac445 | Raw data: 50/page with page number buttons |
| v0.9.0 | f09283c | Lookup editor: sorted by zone + Connected + Unrelated |
| v0.9.1 | 36b0a11 | Lookup editor: only LK_ tables as children |
| v0.9.2 | 1e3f846 | Form Designer: first version with toolbox + preview |
| v0.9.3 | b71b943 | Restructure menus (10 designers + Resources), add FontAwesome |
| v0.9.4 | 9ad3cfc | Icon viewer pages: Lucide + FontAwesome |
| v0.9.5 | e684def | Google-style Search Screen across all text fields |
| v0.9.6 | da6d331 | Unified search: entity search + record search |
| v0.9.7 | 35da66d | Designers search CD tables, Form Designer → cd_forms |
| v0.9.8 | 2777ba5 | Types system: cd_types as central lookup, GET /api/entity-types/:name |
| v0.9.9 | 1f2856d | Type column shows cd_types count per entity (JOIN, not DISTINCT scan) |
| v0.9.10 | 820d07f | Types Editor loads real cd_types data, correct column names |
| — | d3750f5 | Non-blocking import: status bar instead of full-screen overlay |
| — | 49c41a0 | Client-side ZIP unzip (JSZip), individual XMLs sent to server |
| — | f272959 | Fix missing _importStatus declaration |
| — | d480338 | Lightweight startup health check (no more getSchemaFull at boot) |
| — | 1dad6d9 | Remove blocking auto-seed, instant server start |
| — | d435b49 | Types tree: drag & drop to reorder and create hierarchy |
| v0.9.12 | 1011cf3 | Types Editor rewrite: cd_type_type hierarchy, proven drag & drop |
| v0.9.13-17 | various | Version display, deploy indicator, timestamp fixes |
| v0.9.18 | bf2c34a | Fix drag in app (text node handling), Query Editor, import composite PK fix |

---

## 15. RULES FOR AI ASSISTANTS

### ✅ DO:
- Read this document FIRST before any changes
- Use `parseInt()` for the sort field (it's varchar)
- Keep self-link check BEFORE sub check in classification
- Sort prefix map entities by name length (shortest first)
- Test syntax with `node -e` before pushing
- Push small, focused commits
- Match the reference screenshots EXACTLY for colors
- Union xsdFieldData + _schemaFull for complete table list
- Use contiguous sort values (1,2,3...) when reordering
- Designers only interact with CD tables (dictionary)
- Search screen: each designer searches its own CD table

### ❌ DO NOT:
- Modify table structures (no ALTER TABLE, no CREATE TABLE, no DROP)
- Use TRUNCATE in imports (use UPSERT instead)
- Send large files (>2MB) to server in one request (unzip client-side)
- Block startup with heavy queries (no getSchemaFull at boot)
- Add F_ column scanning for relationship detection
- Add search fields, filter bars, or legends to the Database Designer
- Color entity headers/names (only matrix cells are colored)
- Use `typeof r.sort === 'number'` (it's varchar, always string)
- Try to access the live API from this environment (it's blocked)
- Overwrite working code with a "clean rewrite" unless asked
- Create three color zones in User mode (only SYS×SYS yellow, rest gray)
- Introduce CD/SYS/User background colors on row/column headers
- Show entities/subs/links as children in Lookup Editor (only LK_ tables)
- Use entity dropdown selectors in designers (use search screen instead)
- Push during an active import (redeploy interrupts background work)

### 🔍 WHEN IN DOUBT:
- Look at the reference screenshots uploaded by the user
- Count the links (CD should have 24)
- Check that n count equals — count
- Verify DICT prefix → CD_DICTIONARIES (not DICTIONARYCOMPONENTS)
- Ask the user to check the browser console (debug logs are present)
- Check PROJECTDOC section 12 for Form Designer specifics
