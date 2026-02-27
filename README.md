# MetalSpheres - Database Architecture

## Overview

MetalSpheres is a production management SaaS for milling and manufacturing companies.
The platform uses a **dictionary-driven (metadata-driven)** architecture where all
database structures are self-describing.

## Table Groups

| Prefix | Color  | Purpose |
|--------|--------|---------|
| `CD_`  | Blue   | **Dictionary** — Metadata tables describing the data model |
| `SYS_` | Yellow | **System** — Application infrastructure (users, sessions, queues, etc.) |
| *(none)* | Grey | **User** — Business data entities (Contacts, Companies, Projects, etc.) |

## 4 Table Types

| Type | Description | Key Structure |
|------|-------------|---------------|
| **Entity** | Core business objects | `K_<entityname>`, Alias, Name |
| **Link** | N:N junction tables | `K_<4chars_A>`, `K_<4chars_B>`, K_SEQ, F_Type, Main |
| **Sub** | 1:N child tables | `K_<entityname>`, K_SEQ |
| **Lookup** | Dropdown feed tables | `K_<lookupname>`, K_SEQ, Name |

## Field Groups (Column Order)

| Group | Name | Description |
|-------|------|-------------|
| **H**  | Header | System keys, type, main flag |
| **OH** | Optional Header | Name and other optional identifiers |
| **C**  | Custom | Tenant-defined custom fields |
| **OF** | Optional Footer | Memo field |
| **F**  | Footer | Audit trail: lifestatus, owner, created/changed by/date |

## Link Table Naming Convention

Link tables are named using 4-letter prefixes from each entity:
- `COMP_CONT` = Companies ↔ Contacts
- `CONT_COMP` = Contacts ↔ Companies (reversed direction)

The direction is reversible by swapping the prefix order.

## Files

```
database/
  migrations/
    001_cd_dictionary_tables.sql   — CD_ table structures + link tables + indexes
    002_cd_seed_data.sql           — Default metadata for new tenants
```

## Multi-Tenancy

Each tenant starts with the default dictionary metadata (002_cd_seed_data.sql)
and can extend it with custom tables, fields, and relationships.
Multi-tenancy isolation model (schema-per-tenant vs shared) TBD.
