# MetalSpheeres — Project Documentation

## 1. Overview

MetalSpheeres is a production management SaaS for manufacturing companies.
Single-page app architecture: one HTML file (`metalspheeres-app.html` ~4400 lines) + Node.js backend (`server.js` ~1450 lines).

- **Database**: PostgreSQL on Neon (cloud)
- **Hosting**: Render.com free tier (auto-deploy from GitHub main branch)
- **URL**: https://spheeres.onrender.com
- **Repo**: https://github.com/ErikStolk67/Spheeres

## 2. Database Architecture

### 2.1 Dictionary-Driven (Metadata-Driven)

All database structures are self-describing via `cd_tables` and `cd_fields`.
The `f_type` column in `cd_tables` is the **single source of truth** for table classification:

| f_type | Category     | Description |
|--------|-------------|-------------|
| 1      | Entity      | Core business objects |
| 2      | Lookup      | Dropdown/reference tables (LK_ prefix) |
| 3      | Link        | N:N junction tables connecting two entities |
| 4      | Subtable    | 1:N child tables ($ separator or naming convention) |
| 5      | Sys Entity  | System infrastructure entities (SYS_ prefix) |

### 2.2 Table Groups (3 zones)

| Prefix   | Zone   | Color   | Description |
|----------|--------|---------|-------------|
| `CD_`    | Dictionary | Blue (#DBEAFE) | Metadata tables describing the data model |
| `SYS_`   | System | Yellow (#FEF9C3) | Application infrastructure |
| *(none)* | User   | Gray (#F8FAFC) | Business data entities |

### 2.3 Four Table Types

| Type       | Naming Pattern | Key Structure | Example |
|-----------|----------------|---------------|---------|
| **Entity** | No `_` in base name, or `SYS_` + single word | `K_<entity>`, Alias, Name | `CONTACTS`, `SYS_USERS` |
| **Link**   | `ENT1_ENT2` (4-letter prefixes) | `K_<4chars_A>`, `K_<4chars_B>`, K_SEQ | `CONT_COMP` |
| **Sub**    | `$` separator or entity prefix + `_` + suffix | `K_<entity>`, K_SEQ | `CONT$ADDRESSES` |
| **Lookup** | `LK_` prefix | `K_<lookup>`, K_SEQ, Name | `LK_COUNTRIES` |

### 2.4 Link Table Convention

Link tables connect two entities using their 4-letter prefixes:
- `CONT_COMP` = Contacts ↔ Companies
- `CD_TABL_FIEL` = CD_TABLES ↔ CD_FIELDS

**Rules:**
- Every `n` (link) in the matrix has a reciprocal `—` (reverse reference)
- Self-links appear as `nn` on the matrix diagonal
- The total link count = nn count + n count (the `—` are just reciprocals)

### 2.5 Field Groups

| Group | Name             | Description |
|-------|-----------------|-------------|
| H     | Header          | System keys, type, main flag |
| OH    | Optional Header | Name and other optional identifiers |
| C     | Custom          | Tenant-defined custom fields |
| OF    | Optional Footer | Memo field |
| F     | Footer          | Audit trail: lifestatus, owner, created/changed by/date |

## 3. Frontend Architecture

### 3.1 File Structure

```
metalspheeres-app.html   — Single-page app (HTML + CSS + JS, ~4400 lines)
server.js                — Node.js/Express backend (~1450 lines)
package.json             — Dependencies
README.md                — Brief overview
PROJECTDOC.md            — This file (comprehensive docs)
```

### 3.2 Key Functions

| Function | Purpose |
|---------|---------|
| `buildCdSchema()` | Classifies CD_ tables into entities/links/subs/lookups using prefix matching |
| `buildUserSchema()` | Same as buildCdSchema but for SYS_ and User tables |
| `renderDbDesigner()` | Renders the matrix for both CD and User designers |
| `renderDbStatistics()` | Renders statistics cards with table counts |
| `applySchema()` | Applies loaded schema data, triggers cache invalidation |

### 3.3 Database Designer (Matrix)

The designer renders a **cross-matrix** where:
- **Both axes** show ONLY entities (not links, subs, or lookups)
- **Matrix cells** show relationships derived from link tables:
  - `nn` = N:N self-link (on diagonal) — darkest color
  - `n` = link exists (from row entity → column entity) — medium color
  - `—` = reciprocal reference (reverse of an `n`) — lightest color
  - Empty = no relationship — zone background color

#### 3.3.1 Zone Colors

| Zone | Empty cell | Diagonal | nn | n | — |
|------|-----------|----------|-----|---|---|
| **CD (blue)** | #DBEAFE | #BFDBFE | #1D4ED8 | #3B82F6 | #93C5FD |
| **SYS (yellow)** | #FEF9C3 | #FDE68A | #D97706 | #FBBF24 | #FDE68A |
| **User (gray)** | #F8FAFC | #E2E8F0 | #64748B | #94A3B8 | #CBD5E1 |

#### 3.3.2 Header Styling

- **Row headers**: White background, icon + entity name, left-aligned
- **Column headers**: White background, rotated text (writing-mode: vertical-lr + rotate 180deg)
- **Column text alignment**: Left-aligned at bottom (text starts at the bottom of the rotated column, NOT centered in the text length)
- Entity names are NOT colored — only the matrix cells have zone colors

#### 3.3.3 Meta Columns

| Column | Content | Notes |
|--------|---------|-------|
| Type   | Number of types for this entity (from cd_types table) | Clickable → opens types editor |
| Sub    | Number of subtables | Clickable → opens sub dropdown |
| Screens| Number of screens | Display only |

#### 3.3.4 Features

- **No legend bar** — removed, was inaccurate
- **Drag & drop**: Column headers are draggable to reorder. Row order follows column order.
- **Toggle**: Switch between CD Designer and User Database Designer

### 3.4 Link Detection Algorithm (buildCdSchema / buildUserSchema)

Both use the same pattern:

1. **Collect** all tables from `xsdFieldData` + `_schemaFull`
2. **Classify entities**: tables with no `_` in base name (after stripping CD_/SYS_ prefix)
3. **Build prefix map** from entities ONLY (4-char and 3-char prefixes → entity name)
4. **Classify remaining** tables with `_` in base name:
   - Split on `_`, try matching first part + second part against prefix map
   - Both match different entities → **Link table** (from=first, to=second)
   - Both match same entity → **Self-link** (nn on diagonal)
   - Only first matches → **Subtable**
5. **Derive relations**: each link produces `n` at [from, to] and `—` at [to, from]
6. **Build tableList**: only entities, with sub count in SUB column

**CRITICAL**: The prefix map must be built from entities ONLY. Including all tables causes false matches.

### 3.5 Statistics Page

Categorizes all tables into zones (CD/SYS/User) and types (Entity/Link/Sub/Lookup).
Each zone shows 4 cards with table counts, field counts, and record counts.

**Classification rules** (same for all zones):
- `$` in name → subtable
- `_LK_` in name or base starts with `LK_` → lookup
- Base has exactly 2 parts with each ≤5 chars → link
- Base has `_` (other) → subtable
- No `_` in base → entity

## 4. Backend Architecture

### 4.1 API Endpoints

| Endpoint | Method | Purpose |
|---------|--------|---------|
| `/api/schema/full` | GET | Full PostgreSQL schema (tables, columns, types) |
| `/api/tables` | GET | All cd_tables rows (includes f_type) |
| `/api/tables/:id/fields` | GET | Fields for a table |
| `/api/tables/:id/types` | GET/POST | Types for a table |
| `/api/stats/counts` | GET | Record counts per table |
| `/api/seed` | POST | Seed dictionary to database |
| `/api/build-tables` | POST | Build tables from dictionary |
| `/api/import` | POST | Import XML/ZIP schema |

### 4.2 Schema Import (XSD/ZIP)

The import processes Spheeres XSD files and:
1. Parses table/field definitions
2. Classifies tables using `getTableFType()`:
   - Starts with `LK_` or `CD_LK_` → f_type 2 (lookup)
   - No `_` in base → f_type 1 (entity)
   - 2 parts with ≤5 chars each → f_type 3 (link)
   - Otherwise → f_type 4 (subtable) or 1 (entity)
3. Inserts into `cd_tables` with correct f_type
4. Inserts fields into `cd_fields` + link records into `cd_tabl_fiel`

## 5. Deployment

- **GitHub**: Push to `main` branch triggers auto-deploy on Render
- **Render free tier**: Server sleeps after inactivity, cold start takes 30-60 seconds
- **PAT token**: Used for push authentication (stored in Claude memory)

## 6. Version History

| Version | Key Changes |
|---------|------------|
| v0.6.2  | Original baseline — CD Designer working |
| v0.7.1  | User Designer matching CD pattern, zone colors, white headers, drag & drop, no legend |

## 7. RULES FOR AI ASSISTANTS

**DO NOT modify `buildCdSchema()` unless explicitly asked.**
It works correctly. The CD Designer links are correct.

**DO NOT add F_ column scanning** to derive additional relations.
Relations come from link tables only, detected via prefix matching.

**DO NOT add search fields, filter bars, or legends** to the Designer.
The matrix should be clean: toggle + action buttons + matrix only.

**DO NOT change the statistics categorization for CD zone.**
The original name-pattern logic works correctly for CD tables.

**Always start from the current working code.**
Never overwrite working code with a "clean rewrite" unless asked.

**Test locally before pushing** when possible. Render free tier deploys are slow.

**The matrix cell values:**
- `nn` on diagonal = self-referencing link table (e.g., CD_FIEL_FIEL)
- `n` = link exists FROM row entity TO column entity
- `—` = reciprocal of an `n` (always paired)
- Count of `n` cells must equal count of `—` cells
- Count of link tables = count of `nn` cells + count of `n` cells (not counting `—`)
