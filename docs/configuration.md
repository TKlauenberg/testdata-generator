# Configuration Reference

testdata-ai uses a layered configuration model. Settings at higher-priority layers completely override the same section at lower-priority layers (no deep merging within a section).

## Priority Stack (highest to lowest)

| Priority    | Layer        | Where                                                | Examples                                        |
| ----------- | ------------ | ---------------------------------------------------- | ----------------------------------------------- |
| 1 (highest) | field-level  | DSL field declaration                                | `name: string generator=firstName()`            |
| 2           | schema-level | DSL `@defaults` block                                | `@defaults { string generator=pick(...) }`      |
| 3           | workspace    | `.tdconfig.json` in project root (upward-discovered) | `generatorDefaults`, `context.saveDirectory`    |
| 4           | global       | `~/.tdconfig.json`                                   | `defaults.count`, `defaults.format`             |
| 5 (lowest)  | built-in     | Hardcoded defaults                                   | count=10, format=json, saveDirectory=./contexts |

## Configuration Scope Matrix

| Setting                 | Built-in  | Global (`~/.tdconfig.json`) | Workspace (`.tdconfig.json`) | Schema `@defaults`    | Field-level             |
| ----------------------- | --------- | --------------------------- | ---------------------------- | --------------------- | ----------------------- |
| `defaults.count`        | ✓         | ✓                           | ✓                            | —                     | —                       |
| `defaults.format`       | ✓         | ✓                           | ✓                            | —                     | —                       |
| `context.saveDirectory` | ✓         | ✓                           | ✓                            | —                     | —                       |
| `generatorDefaults`     | ✓ (empty) | ✓                           | ✓                            | ✓ (`@defaults` block) | ✓ (`generator=…`)       |
| Field uniqueness        | —         | —                           | —                            | ✓ (`unique=true`)     | ✓ (`unique=true/false`) |

**Key rules:**
- `defaults.count` and `defaults.format` are CLI/workspace/global config only — there is no DSL equivalent.
- `context.saveDirectory` is the default directory used when `--save-context` is provided without `--save-context-dir`. The `--save-context-dir` CLI flag is a **runtime override** that does not write to any config file; it affects only the current invocation.
- `generatorDefaults` is configured at CLI/workspace/global level and overridden by DSL `@defaults`, which is in turn overridden by explicit field declarations.
- Uniqueness defaults are schema-level DSL only (`@defaults { unique=true }`); they have no CLI config equivalent.

## CLI vs Schema Semantics Boundary

The config layers split cleanly into two groups:

**CLI/workspace/global config** (`packages/cli/`) governs runtime behaviour:
- How many records to generate by default (`defaults.count`)
- What output format to use by default (`defaults.format`)
- Where generated context is stored by default (`context.saveDirectory`)
- Default generator mappings for field types when no generator is declared (`generatorDefaults`)

**Schema-level (`@defaults` block in DSL)** governs data-shape semantics:
- Per-schema generator defaults for matching field types
- Schema-wide uniqueness constraints for fields that don't declare their own

Schema-level `@defaults` settings are part of the DSL and belong in `.td` files. They are not expressed in JSON config files. This boundary must stay clean — CLI config must not embed DSL semantics, and `.td` schema files must not reference filesystem paths.

## Layer Cascade Examples

### Example 1: Only built-in defaults

No config files exist. All settings come from built-in defaults.

```bash
$ td config show
Effective Configuration
═══════════════════════

Layer priority:  field-level  >  schema-level  >  workspace  >  global  >  built-in

Config files:
  global     /home/user/.tdconfig.json  (not found — using built-in defaults)
  workspace  (not found)

Settings:
  defaults.count        10           [built-in]
  defaults.format       json         [built-in]
  context.saveDirectory ./contexts   [built-in]
  generatorDefaults     (none)       [built-in]
```

### Example 2: Global config provides defaults

`~/.tdconfig.json` exists with a `defaults` section:

```json
{
  "defaults": {
    "count": 25,
    "format": "json"
  }
}
```

```bash
$ td config show
...
Settings:
  defaults.count        25           [global]
  defaults.format       json         [global]
  context.saveDirectory ./contexts   [built-in]
  generatorDefaults     (none)       [built-in]
```

### Example 3: Workspace overrides global

`~/.tdconfig.json` provides `defaults` and `context`. A `.tdconfig.json` in the project root provides `context` (overriding global) and `generatorDefaults`.

```bash
$ td config show
...
Settings:
  defaults.count        25           [global]
  defaults.format       json         [global]
  context.saveDirectory ./team-ctx   [workspace]
  generatorDefaults     string: pick [workspace]
```

### Example 4: Schema-level defaults override workspace generatorDefaults

A `.td` schema declares `@defaults { string generator=randomString(length=14) }`. When this schema is validated or used for generation, the `randomString` generator takes priority over any `generatorDefaults` in the config files for `string` fields within that schema.

Field-level declarations always win above everything else.

## Epic 8 Context Settings

The context layer saves generated records for later reuse via `--save-context` and `--use-context` flags.

| Setting                 | Scope                          | Description                                                       |
| ----------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `context.saveDirectory` | Config file (global/workspace) | Default directory for stored context files                        |
| `--save-context-dir`    | CLI runtime flag               | Per-invocation override of `context.saveDirectory`; not persisted |
| `--save-context <name>` | CLI runtime flag               | Save current output as named context                              |
| `--use-context <name>`  | CLI runtime flag               | Load a named context for use in current run                       |

`--save-context-dir` is a runtime CLI concern — it does not modify any config file and affects only the current invocation. It is not related to schema/DSL semantics.

## Section-Level Override Semantics

Overrides are **shallow at the section level**, not deep-merged. If a workspace config provides a `defaults` section, the entire `defaults` section from the workspace replaces the global `defaults` section, rather than merging individual keys.

**Example:** Global config has `{ "defaults": { "count": 25, "format": "json" } }`. Workspace config has `{ "defaults": {} }` (empty object). Result: `defaults.count` and `defaults.format` revert to built-in values because the workspace `defaults` section replaced the global one.

## Show Effective Configuration

Use `td config show` to inspect the effective configuration and see which layer each setting comes from:

```bash
td config show
```

This command loads the full layer stack using the same pipeline as all other commands and annotates each setting with its winning source layer.
The config file table also marks each discovered file as `(found)` or `(not found ...)`.

## Config File Format

Both global (`~/.tdconfig.json`) and workspace (`.tdconfig.json`) files use the same JSON format. All sections are optional:

```json
{
  "defaults": {
    "count": 25,
    "format": "json"
  },
  "context": {
    "saveDirectory": "./team-contexts"
  },
  "generatorDefaults": [
    {
      "fieldType": "string",
      "generator": {
        "name": "pick",
        "parameters": [
          {
            "name": "array",
            "value": ["alpha", "beta", "gamma"]
          }
        ]
      }
    }
  ]
}
```

The workspace config (`.tdconfig.json`) is discovered by searching upward from the current working directory through parent directories. It is intended for version-controlled, team-shared defaults.
