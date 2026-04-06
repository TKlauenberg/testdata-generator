# Platform Migration Guide

Story 12.4 adds a deterministic platform-ready export path for future centralized ingest without building a platform backend today.

## Scope

Included:

- Exporting an existing metadata-bearing local artifact
- Reusing the canonical generation metadata contract
- Reusing `.td-history.jsonl` for generation audit data
- Reusing `.td-pattern-versions` for immutable pattern snapshots
- Preserving structured context-reference metadata for future dependency analysis

Explicitly out of scope:

- Remote sync
- Platform APIs
- Re-running generation during export
- Creating a second audit store

## Supported Inputs

`td export --platform-ready` supports these local artifact shapes only:

- Generated JSON output (`{"metadata": ..., "data": [...]}`)
- Generated CSV output with the leading metadata comment
- Generated SQL output with the leading metadata comment
- Saved-context JSON envelopes created by `--save-context`

## Command Usage

```bash
td export reports/users.json --platform-ready
td export contexts/generated-users.json --platform-ready --output exports/users-platform-ready.json
```

The command reads the existing artifact, resolves audit files using `history.logDirectory`, and emits a single JSON bundle to stdout by default.

## Export Contract

The platform-ready bundle uses this top-level structure:

```json
{
  "contract": "testdata-ai/platform-ready-export",
  "version": 1,
  "exportedAt": "2026-04-06T12:00:00.000Z",
  "artifact": {
    "type": "generated-json",
    "format": "json",
    "payload": {
      "metadata": {
        "timestamp": "2026-04-06T09:15:00.000Z",
        "sourcePattern": "schemas/exportable.td",
        "count": 2,
        "format": "json",
        "seed": 42,
        "version": "0.1.0",
        "patternHash": "...",
        "lineage": [
          {
            "type": "root-pattern",
            "identifier": "schemas/exportable.td",
            "hash": "..."
          }
        ],
        "platformReserved": {
          "contextReferences": [
            {
              "raw": "@context.users.random.email",
              "collection": "users",
              "tags": [],
              "selector": { "kind": "random" },
              "fieldPath": ["email"]
            }
          ]
        }
      },
      "data": [
        { "id": 1, "email": "qa.one@example.com" }
      ]
    }
  },
  "metadata": {
    "timestamp": "2026-04-06T09:15:00.000Z",
    "sourcePattern": "schemas/exportable.td",
    "count": 2,
    "format": "json",
    "seed": 42,
    "version": "0.1.0",
    "patternHash": "..."
  },
  "historyEntry": {
    "status": "success",
    "durationMs": 120,
    "recordsPerSecond": 16.67
  },
  "patternSnapshot": {
    "patternHash": "...",
    "lineage": []
  }
}
```

Notes for platform consumers:

- `metadata` is the canonical generation metadata to trust for lineage matching.
- `artifact.payload` is the original exported local artifact content.
- `historyEntry` provides the audit record for the exact generation run.
- `patternSnapshot` preserves the immutable source inputs keyed by `patternHash`.
- `platformReserved.contextReferences` captures the structured `@context` expressions used by the schema.

## Operator Workflow

1. Generate data locally with history enabled.
2. Keep the generated artifact or saved-context file you want to migrate.
3. Run `td export <artifact> --platform-ready`.
4. Hand the resulting JSON bundle to the future platform ingest pipeline.

## Failure Modes

Export fails explicitly when:

- The artifact is not a supported metadata-bearing format.
- Embedded metadata is missing or malformed.
- No unique history entry matches `timestamp`, `sourcePattern`, and `patternHash`.
- No stored pattern-version snapshot exists for the artifact's `patternHash`.

These failures are intentional. The migration bundle must never imply complete lineage when the local audit trail is incomplete.