# MetalSpheeres — Project Documentation

> **Read this FIRST before making any changes.**

## 1. Overview

MetalSpheeres is a production management SaaS for manufacturing companies.
Single-page app: one HTML file + Node.js backend.

| Item | Value |
|------|-------|
| Frontend | `metalspheeres-app.html` (~4400 lines, HTML + CSS + JS) |
| Backend | `server.js` (~1500 lines, Node.js/Express) |
| Database | PostgreSQL on Neon (cloud) |
| Hosting | Render.com free tier, auto-deploy from GitHub `main` |
| URL | https://spheeres.onrender.com |
| Repo | https://github.com/ErikStolk67/Spheeres |

### 1.1 File Structure

```
metalspheeres-app.html  — Single-page app (ALL frontend code)
server.js               — Express API server
package.json            — Dependencies (express, pg)
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
| `/api/tables/:id/types` | GET/POST | Types for a table |
| `/api/types/counts` | GET | Type count per table name (for Type column) |

### 5.2 Data & Stats

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/stats/counts` | GET | Record counts per table |
| `/api/raw/:table` | GET | Raw table data |
| `/api/data/:table` | POST | Insert/update data |

### 5.3 Admin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/seed` | POST | Seed dictionary |
| `/api/seed-xsd` | POST | Seed from XSD field data |
| `/api/build-tables` | POST | Create PostgreSQL tables from dictionary |
| `/api/migrate` | POST | Run migrations |
| `/api/import-xml` | POST | Import XML data into existing tables |
| `/api/import-schema` | POST | Import Verspaning-style schema XML |

### 5.4 Schema Import (XSD/ZIP)

The import processes Spheeres XSD files and:
1. Parses table/field definitions from XML
2. Classifies tables using `getTableFType()` in server.js:
   - Starts with `LK_` or `CD_LK_` → f_type 2 (lookup)
   - No `_` in base → f_type 1 (entity)
   - 2 parts with ≤5 chars each → f_type 3 (link)
   - Otherwise → f_type 4 (subtable)
3. Inserts into `cd_tables` with correct f_type and sort = tableId
4. Inserts fields into `cd_fields` + link records into `cd_tabl_fiel`

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
| `handleRowDrop()` | Drag & drop handler: reorders entities, saves sort to server |

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
3. Base has exactly 2 parts with each ≤5 chars → link
4. Base has `_` (other) → subtable
5. No `_` in base → entity

Statistics cards sort **alphabetically** within each category.

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

- Uses Lucide icons v0.263.1 (CDN)
- `cdIconMap`: maps CD entity base names to icons (e.g. 'FIELDS':'list', 'TABLES':'grid')
- `userIconMap`: maps SYS/User entity names to icons (e.g. 'SYS_USERS':'users')
- Fallback stub if Lucide CDN fails

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

Frontend: Lucide Icons v0.263.1 (CDN), no build step, no framework.

---

## 12. Known Issues & Gotchas

| # | Issue | Detail |
|---|-------|--------|
| 1 | **sort is varchar** | cd_tables.sort is varchar(500). Use parseInt(). Never typeof === 'number'. |
| 2 | **Prefix collisions** | DICT/DIC claimed by DICTIONARYCOMPONENTS if not sorted by length first. |
| 3 | **No API testing** | spheeres.onrender.com blocked from Claude's environment. |
| 4 | **Self-link order** | Self-link check must be BEFORE sub check or CD_DICO_DICO misclassifies. |
| 5 | **CD_CANVASES** | Only in live DB, not in XSD seed. Must union xsdFieldData + _schemaFull. |
| 6 | **CNTR abbreviation** | CD_FIEL_CNTR uses CNTR not CONT. Needs hardcoded alias in prefix map. |
| 7 | **Render cold start** | First request 30-60s. SessionStorage cache shows instant stale data. |

---

## 13. Version History (key milestones)

| Version | Commit | Changes |
|---------|--------|---------|
| v0.6.2 | f06a369 | Original baseline, CD Designer working |
| v0.7.1 | 8875425 | Clean restart, User Designer, zone colors |
| v0.7.2 | 41ae4a4 | Self-link bug fix (CD_DICO_DICO), white gridlines |
| v0.7.9 | 3cae5a2 | Prefix map fix (24 links), parseInt sort, type counts |
| v0.8.0 | d1b8f51 | Drag & drop via row headers, saves sort |
| v0.8.1 | a3e1edb | parseInt fix for varchar sort column |
| v0.8.3 | e27a06e | User designer: only SYS×SYS yellow, all else gray |

---

## 14. RULES FOR AI ASSISTANTS

### ✅ DO:
- Read this document FIRST before any changes
- Use `parseInt()` for the sort field (it's varchar)
- Keep self-link check BEFORE sub check in classification
- Sort prefix map entities by name length (shortest first)
- Test syntax with `node -e` before pushing
- Push small, focused commits
- Match the reference screenshots EXACTLY for colors
- Union xsdFieldData + _schemaFull for complete table list

### ❌ DO NOT:
- Modify table structures (no ALTER TABLE, no CREATE TABLE, no CAST)
- Add F_ column scanning for relationship detection
- Add search fields, filter bars, or legends to the Designer
- Color entity headers/names (only matrix cells are colored)
- Use `typeof r.sort === 'number'` (it's varchar, always string)
- Try to access the live API from this environment (it's blocked)
- Overwrite working code with a "clean rewrite" unless asked
- Create three color zones in User mode (only SYS×SYS yellow, rest gray)
- Make column headers draggable (rotated CSS breaks drag events)
- Introduce CD/SYS/User background colors on row/column headers

### 🔍 WHEN IN DOUBT:
- Look at the reference screenshots uploaded by the user
- Count the links (CD should have 24)
- Check that n count equals — count
- Verify DICT prefix → CD_DICTIONARIES (not DICTIONARYCOMPONENTS)
- Ask the user to check the browser console (debug logs are present)
