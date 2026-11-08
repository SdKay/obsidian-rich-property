# Examples

Each complete file below was run through `node scripts/rich-property.cjs validate` and passes.

## 1. From nothing

The user wants two kinds of note and one field that only meetings have. Start with
`preset --blank` and keep its `reserved` list exactly as printed (other plugins depend on it), then add
the types, the field and write the file:

```json
{
  "schemaVersion": 2,
  "typeField": "type",
  "reserved": [
    "excalidraw-plugin",
    "kanban-plugin",
    "cssclasses",
    "aliases",
    "banner",
    "banner_x",
    "highlighter",
    "lineNumbers",
    "transition",
    "theme",
    "css",
    "drawings"
  ],
  "fields": {
    "type": {
      "kind": "enum",
      "description": "What kind of note this is.",
      "source": {
        "kind": "static",
        "values": [
          {
            "value": "note",
            "description": "An ordinary note."
          },
          {
            "value": "meeting",
            "description": "Notes from a meeting."
          }
        ]
      }
    },
    "status": {
      "kind": "enum",
      "description": "Where the meeting notes stand.",
      "types": [
        "meeting"
      ],
      "source": {
        "kind": "static",
        "values": [
          {
            "value": "draft",
            "color": "orange"
          },
          {
            "value": "final",
            "color": "green"
          }
        ]
      }
    }
  },
  "rules": []
}
```

```bash
node scripts/rich-property.cjs validate rules.json
node scripts/rich-property.cjs install rules.json "<vault>" --blank
```

`--blank` writes the set to the from-scratch slot and switches the plugin to it. Without `--blank` the
same file would replace the edited built-in rules instead.

## 2. Extend the built-in rules

The user keeps the built-in rules and wants a `client` field for tasks and briefs, taken from the folders
inside `3-resources/clients`, hidden once a task is done. Do not retype the built-in file: print it,
change only what is new, and keep everything else.

```bash
node scripts/rich-property.cjs preset > rules.json
```

Then, in `rules.json`, add to `fields`:

```json
"client": {
  "kind": "enum",
  "description": "The client this work is for.",
  "types": ["task", "brief"],
  "source": { "kind": "vault-dir", "paths": ["3-resources/clients"] }
}
```

and to `rules`:

```json
{ "id": "client-not-for-done", "match": "all",
  "when": [{ "field": "status", "in": ["done"] }],
  "then": [{ "field": "client", "effect": "unavailable" }] }
```

Validate and install without `--blank`. The descriptions that start with `i18n:` stay as they are.
Because the plugin writes the edited set to `customSchema`, the user will not pick up later improvements
to the built-in rules automatically; say so if it matters.

## 3. A task and bug tracker

Two kinds of work whose `status` means different things, a severity only bugs have, a due date only tasks
have, and a few tags. Status holds all the values, limited to `task` and `bug`, and one rule per type
narrows it.

```json
{
  "schemaVersion": 2,
  "typeField": "type",
  "reserved": [
    "excalidraw-plugin",
    "kanban-plugin",
    "cssclasses",
    "aliases",
    "banner",
    "banner_x",
    "highlighter",
    "lineNumbers",
    "transition",
    "theme",
    "css",
    "drawings"
  ],
  "fields": {
    "type": {
      "kind": "enum",
      "source": {
        "kind": "static",
        "values": [
          {
            "value": "task"
          },
          {
            "value": "bug"
          },
          {
            "value": "note"
          }
        ]
      }
    },
    "status": {
      "kind": "enum",
      "types": [
        "task",
        "bug"
      ],
      "source": {
        "kind": "static",
        "values": [
          {
            "value": "todo"
          },
          {
            "value": "doing",
            "color": "blue"
          },
          {
            "value": "done",
            "color": "green"
          },
          {
            "value": "open",
            "color": "orange"
          },
          {
            "value": "fixed",
            "color": "green"
          },
          {
            "value": "wontfix",
            "color": "neutral"
          }
        ]
      }
    },
    "severity": {
      "kind": "enum",
      "types": [
        "bug"
      ],
      "description": "How bad the bug is.",
      "source": {
        "kind": "static",
        "values": [
          {
            "value": "minor"
          },
          {
            "value": "major",
            "color": "orange"
          },
          {
            "value": "critical",
            "color": "red",
            "solid": true,
            "description": "Fix before anything else."
          }
        ]
      }
    },
    "due": {
      "kind": "date",
      "types": [
        "task"
      ]
    },
    "tags": {
      "kind": "tags",
      "source": {
        "kind": "tag-vocab",
        "axes": [
          {
            "label": "Area",
            "prefix": "area",
            "values": [
              {
                "value": "ui"
              },
              {
                "value": "api"
              },
              {
                "value": "docs"
              }
            ]
          }
        ]
      }
    }
  },
  "rules": [
    {
      "id": "status-for-task",
      "match": "all",
      "when": [
        {
          "field": "type",
          "in": [
            "task"
          ]
        }
      ],
      "then": [
        {
          "field": "status",
          "effect": "values",
          "values": [
            {
              "value": "todo"
            },
            {
              "value": "doing",
              "color": "blue"
            },
            {
              "value": "done",
              "color": "green"
            }
          ]
        }
      ]
    },
    {
      "id": "status-for-bug",
      "match": "all",
      "when": [
        {
          "field": "type",
          "in": [
            "bug"
          ]
        }
      ],
      "then": [
        {
          "field": "status",
          "effect": "values",
          "values": [
            {
              "value": "open",
              "color": "orange"
            },
            {
              "value": "fixed",
              "color": "green"
            },
            {
              "value": "wontfix",
              "color": "neutral"
            }
          ]
        }
      ]
    }
  ]
}
```

```bash
node scripts/rich-property.cjs install rules.json "<vault>" --blank
```

## Checking the user's own wishes

Before writing, restate in a sentence what each field will allow ("`status` for a bug: open, fixed or
wontfix"). It is much cheaper to correct a sentence than a rules file the user cannot read.
