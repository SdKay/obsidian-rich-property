---
name: obsidian-rich-property
description: >
  Create, review and install the property rules (the plugin's data.json) for the Rich Property
  Obsidian plugin. Use this skill whenever the user asks to set up, design, generate, change or
  check the allowed note properties of an Obsidian vault with Rich Property: which fields exist,
  their allowed values and colors, which note types a field belongs to, rules that link properties
  ("when author is agent, review is available"), or a start-from-scratch rule set. Also use it to
  read or explain an existing Rich Property configuration.
---

# Rich Property: rules for an agent

Rich Property puts a vault's own rules on Obsidian's property panel: dropdowns of allowed values,
fields that follow the note `type`, colored values, mistakes marked. The rules live in the plugin's
`data.json`. This skill lets you write them for the user and check them before they are used.

> **Obsidian-only.** The rules have no effect outside the plugin.

## The one rule that saves time

**Do not hand-edit `data.json`. Write the rules to a file, validate, then install.** The plugin
checks the rules against many cross-references; one slip makes it discard the whole set and quietly
use the built-in rules, and the user only sees an error in the settings. The bundled tool runs the
plugin's own checker, so a file it accepts is a file the plugin accepts.

```bash
node scripts/rich-property.cjs preset [--blank]        # the built-in rules, or the empty start, as JSON
node scripts/rich-property.cjs validate rules.json     # lists every problem, exit 1 if any
node scripts/rich-property.cjs install rules.json <vault> [--blank]
```

`<vault>` is the vault's root folder, the one that contains `.obsidian`, not the plugin folder.

Plain Node 18+, no Obsidian needed. `install` validates first, copies the old `data.json` to
`data.json.bak`, and changes only its own keys (`customSchema`, or with `--blank` `blankSchema` and `blank`).

## Workflow

1. **Find out what the user wants.** Ask only what you cannot see: the note types they use, the
   fields and their allowed values, which fields depend on others. Read a few of their notes and any
   rules document in the vault rather than asking.
2. **Pick a starting point.**
   - *Change the built-in rules*: `preset > rules.json`, edit, keep what the user did not mention.
   - *Build from nothing*: `preset --blank > rules.json`, then add types, fields and rules.
3. **Write or edit `rules.json`.** Print the starting file with `preset` and change only the keys you
   mean to; never retype a whole built-in set from memory, it is long and the details (`reserved`,
   descriptions, colors) are easy to lose. Follow [references/schema.md](references/schema.md) for the structure
   and [references/rules.md](references/rules.md) for rules. Examples are in
   [references/examples.md](references/examples.md).
4. **Validate** with `validate`. Fix every problem it lists; do not install until it says `valid`.
5. **Install** with `install`, passing `--blank` only for a from-scratch set. Then tell the user to
   **switch the plugin off and on** in Settings > Community plugins. If Obsidian is open while the file
   is written, its in-memory settings can overwrite the new ones when the plugin unloads, so ask the
   user to close the plugin first, or to reload after.
6. **Report** what you set up in the user's words: the types, the fields and what each allows.

## Where the rules go

`data.json` holds `version`, `styling`, `blank`, `customSchema` and `blankSchema`. The rules
themselves are `customSchema` (the built-in start) or `blankSchema` (the start-from-scratch start);
`blank` says which is in use. `install` sets the right one. Everything else in `data.json` is the
user's own setting: never rewrite it by hand.

## Things that are easy to get wrong

- **`type` is special.** Every set of rules has a field named by `typeField` (default `type`). It must be
  a single choice with a static list of values. A from-scratch set starts with an empty list. All the
  other fields refer to its values (`types`, rule conditions).
- **A field's `types` and rule conditions can only name values that exist** in the `type` field's list,
  and fields that exist. Add the type first.
- **Values that change with the note type** (a `status` that means different things for a task and a
  decision): the field holds the union of every value, and one rule per type narrows it. See
  [references/rules.md](references/rules.md). Do not put a different list on each type any other way.
- **Colors are tokens, not hex.** Only `red orange yellow green cyan blue purple pink neutral`.
  Use color for values that call for attention and give everything else one plain color; the same color
  should mean the same thing everywhere. A sensible mapping: red needs action now or is risky, orange
  is to do or take care, green is done or allowed, blue is in progress, neutral is ended or replaced,
  and one plain color (the built-in rules use purple) for the rest. The values of `type` are categories,
  not states, so give them the plain color or none.
- **Keep `reserved` exactly as `preset` printed it.** It lists properties that other plugins own
  (`cssclasses`, `aliases`, `banner`, `kanban-plugin`, ...). Dropping one makes the plugin mark that
  plugin's property as unknown. Add to it if the user names more; never shorten it.
- **Use the user's own spelling for values.** `in progress` is fine with the space; values are written to
  the note exactly as given and compared with the same case.
- **Folder sources.** In `vault-dir`, `paths` are vault-relative with no trailing slash (`Clients`,
  `projects`). `validate` does not check that the folders exist; the plugin marks a missing one
  in the settings and offers no values from it. `requireFile` (for example `brief.md`) keeps only the
  folders that hold that file; leave it out to offer every subfolder. `depth: 2` also offers the folders
  one level down, written `Parent/Child`; a folder without `requireFile` is skipped but its children are still read.
- **`types` and rules add up.** `types` says which note types a field exists in; a rule's `available`
  then says when it can be used. A field that should only matter in some cases of one type needs both.
- **Keep `i18n:` descriptions.** A `description` that starts with `i18n:` is a built-in text the plugin
  translates to the user's language. Leave those untouched; write your own plain text for new ones.
- **Values must be unique and non-empty** within a list, and at least one value is needed for a
  single or multiple choice field (except `type` in a from-scratch set).
- **The plugin never edits anything on its own.** It marks values that break the rules and offers
  the allowed ones; it does not rewrite existing notes. Say so if the user expects a migration.

## When something is off

- `validate` prints every problem with its path (`fields.status.source.values[0]: unknown color`). Fix
  them all, run it again.
- The settings page of the plugin shows "the saved custom schema is damaged" if a hand-written file
  slipped through; restoring the built-in rules there is safe, and `data.json.bak` has the previous file.
- Rules saved by an older version are upgraded on load; you do not need to convert them.
