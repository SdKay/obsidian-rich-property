# The rules file

A set of rules is one JSON object. `node scripts/rich-property.cjs preset` prints the built-in one.
The snippet below is cut down to show the shape; in a real file keep `reserved` as `preset` prints it.

```json
{
  "schemaVersion": 2,
  "typeField": "type",
  "reserved": ["cssclasses", "aliases", "banner"],
  "fields": { "type": { "kind": "enum", "source": { "kind": "static", "values": [{ "value": "note" }] } } },
  "rules": []
}
```

| Key | Meaning |
|---|---|
| `schemaVersion` | Always `2`. An older `1` is upgraded on load. |
| `typeField` | The name of the field that decides the note type. Keep `type`. |
| `reserved` | Properties owned by other plugins. Never checked, marked or changed. Keep the built-in list and add to it. |
| `fields` | Every property the plugin knows, keyed by name. |
| `rules` | Links between properties. See [rules.md](rules.md). |

## A field

```json
"priority": {
  "kind": "enum",
  "description": "How urgent the task is.",
  "source": { "kind": "static", "values": [
    { "value": "low" },
    { "value": "medium", "color": "orange" },
    { "value": "high", "color": "red", "solid": true, "description": "Do this first." }
  ] },
  "types": ["task"]
}
```

| Key | Meaning |
|---|---|
| `kind` | What the value is. Table below. Required. |
| `description` | One line shown in the settings. Plain text, or an `i18n:` key (see below). Optional. |
| `source` | Where the allowed values come from. Required for `enum` and `multi-enum`. |
| `types` | The note types this field applies to. Absent means every type. Every name must be a value of the `type` field. |
| `pattern` | A regular expression every value must match (every item, for `text-list`). Only for `text` and `text-list`; `validate` refuses it on any other kind. Optional. |
| `patternHint` | The format in words, shown when a value does not match `pattern`, such as `<repo>@<branch>:<10 hex>`. Optional. |
| `placeholder` | `true` or `false` only. Whether a missing field shows as a one-click placeholder button. By default a field with `types` shows one in a note of that type, and a field without `types` does not. |

### `kind`

| `kind` | Value | Dropdown |
|---|---|---|
| `enum` | one of a list | yes |
| `multi-enum` | several of a list | yes |
| `bool` | `true` or `false` | yes |
| `tags` | a list of tags, grouped | yes, from a `tag-vocab` source; without one the field has no dropdown |
| `link` | one `[[note]]` | note search |
| `link-list` | a list of `[[note]]` | note search |
| `date` | `YYYY-MM-DD` | the native date picker |
| `datetime` | `YYYY-MM-DD`, or the older `YYYY-MM-DD HH:mm:ss` | none, the format is checked |
| `date-range` | `"YYYY-MM-DD ~ YYYY-MM-DD"` | none, the format is checked |
| `int` | a whole number | none |
| `text` | any text | none |
| `text-list` | a list of text | none |

Only `enum`, `multi-enum`, `bool` and `tags` get a dropdown of allowed values. The other kinds are
checked for their format, not offered a list. A `text-list` is a real YAML list of text; add a
`pattern` to hold its items to a format.

### `source`

| `source.kind` | Fields | Used with |
|---|---|---|
| `static` | `values`: a list of options | `enum`, `multi-enum` |
| `vault-dir` | `paths`: vault folders; `requireFile` (optional): a file name, so only folders that contain it are offered; `depth` (optional, 1 to 3, default 1): how many folder levels to read. The values are the folders inside `paths`, written as the path from it (`Work`, `Work/Sub` at depth 2) | `enum`, `multi-enum` |
| `tag-vocab` | `axes`: tag groups | `tags` |
| `note-search` | `folder` (optional): limits the search | `link`, `link-list` |

A `note-search` `folder` of one name (`decisions`) matches that folder at any depth; a path
(`2-projects`) is a prefix from the vault root.

### An option (a value in a list)

| Key | Meaning |
|---|---|
| `value` | The text written to the note. Required, not empty, unique within the list. |
| `color` | One of `red orange yellow green cyan blue purple pink neutral`. Optional. |
| `solid` | `true` shows the color as a filled block instead of tinted text. Has no effect without a `color`. |
| `description` | What the value means, shown beside it in the menu. Plain text or an `i18n:` key. |

### Tag groups

```json
{ "kind": "tags", "source": { "kind": "tag-vocab", "axes": [
  { "label": "Software", "prefix": "sw", "values": [{ "value": "zephyr" }, { "value": "linux" }] },
  { "label": "Wi-Fi", "prefix": "wifi", "allowBare": true, "bare": { "color": "blue" },
    "values": [{ "value": "mesh" }] }
] } }
```

Each group writes tags as `prefix/value` (`sw/zephyr`). `allowBare` also allows the prefix alone
(`wifi`), and `bare` styles it. Values are options, so they take a color, `solid` and a description.

## The `type` field

`typeField` names a field that must exist, must be `enum`, and must have a `static` source. It is the
only list that may be empty (a from-scratch set has no types yet). A note type is just a value of it.
To add a type, add a value; to use it, name it in a field's `types` or a rule's condition.

## `i18n:` descriptions

The built-in rules write descriptions as `"i18n:desc.status"`. The plugin translates these to the
user's language. When you edit the built-in rules, leave them alone. For anything new, write plain text
in the language the user works in.

## Colors mean something

Use color for values that call for attention and give every other value one plain color, so the
colored ones stand out. Keep each color to one meaning across the whole set. The built-in rules use:
red for needs action or high risk, orange for to do or take care, green for done or allowed, blue for
in progress, neutral for ended or replaced, purple for every other value.
