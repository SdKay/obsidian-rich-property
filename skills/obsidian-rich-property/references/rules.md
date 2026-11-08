# Rules

A rule links properties: when some conditions hold on a note, it changes what other properties allow.

```json
{
  "id": "review-needs-agent",
  "match": "all",
  "when": [{ "field": "author", "in": ["agent", "mixed"] }],
  "then": [{ "field": "review", "effect": "available" }]
}
```

| Key | Meaning |
|---|---|
| `id` | Unique, not empty. Any text; `status-for-task` style names are easy to read. |
| `match` | `"all"`: every condition must hold. `"any"`: one is enough. |
| `when` | The conditions. Empty means the rule always applies. |
| `then` | What changes. At least one effect. |

Every field named in `when` and `then` must exist in `fields`. Rules read the **raw values** in the
note, never another rule's result, so rules cannot loop.

## Conditions

| Condition | Holds when |
|---|---|
| `{ "field": "author", "in": ["agent", "mixed"] }` | the value is one of these (for a list value: any element is) |
| `{ "field": "author", "notIn": ["human"] }` | the value is none of these, or the field is missing |
| `{ "field": "review", "exists": true }` | the field has a value (not empty, not an empty list) |
| `{ "field": "review", "exists": false }` | the field is missing or empty |

Values are compared as written, with the same spelling and case as in the note.

## Effects

| `effect` | Does |
|---|---|
| `"available"` | the field can be used only while this rule holds |
| `"unavailable"` | the field cannot be used while this rule holds |
| `"values"` (with `"values": [options]`) | the allowed values become this list while the rule holds |

A field that is not available is **marked as a mistake if the note has it** and is **not offered as a
placeholder if it is missing**. Nothing is deleted. A `values` list should be a subset of the field's
own list so the colors and descriptions agree.

### When several rules name the same field

- **`unavailable`** from any rule that holds wins over everything else.
- **`available`**: if any rule names the field with `available`, the field is usable only while at least
  one of those rules holds. With none holding, it is not available.
- **`values`**: every rule that holds narrows the list; a value must be allowed by all of them.
  With no rule holding, the field's own list applies.
- A rule whose condition reads the note `type` does not decide anything for a note with no valid type.

## Pattern: a field that depends on another field

`reviewed` (the date of a review) only makes sense once `review` is `reviewed` or `changed`:

```json
{
  "id": "reviewed-needs-review",
  "match": "all",
  "when": [{ "field": "review", "in": ["reviewed", "changed"] }],
  "then": [{ "field": "reviewed", "effect": "available" }]
}
```

## Pattern: values that change with the note type

`status` means something different for a task and for a decision. Put **every** value in the field's own
list (the union), limit the field to the types that use it, and add one rule per type:

```json
"status": {
  "kind": "enum",
  "source": { "kind": "static", "values": [
    { "value": "todo" }, { "value": "doing", "color": "blue" }, { "value": "blocked", "color": "red" },
    { "value": "done", "color": "green" }, { "value": "proposed", "color": "orange" },
    { "value": "accepted", "color": "green" }
  ] },
  "types": ["task", "decision"]
}
```

```json
{ "id": "status-for-task", "match": "all",
  "when": [{ "field": "type", "in": ["task"] }],
  "then": [{ "field": "status", "effect": "values", "values": [
    { "value": "todo" }, { "value": "doing", "color": "blue" },
    { "value": "blocked", "color": "red" }, { "value": "done", "color": "green" }
  ] }] }
```

```json
{ "id": "status-for-decision", "match": "all",
  "when": [{ "field": "type", "in": ["decision"] }],
  "then": [{ "field": "status", "effect": "values", "values": [
    { "value": "proposed", "color": "orange" }, { "value": "accepted", "color": "green" }
  ] }] }
```

A value that two types share (`done`) has one entry in the field's list, so give it one color there and
use the same color in each rule. A note with no `type` is not judged on `status`, so nothing is marked wrong.

## Pattern: hide a field in some cases

```json
{ "id": "no-review-for-human", "match": "all",
  "when": [{ "field": "author", "in": ["human"] }],
  "then": [{ "field": "review", "effect": "unavailable" }] }
```

## Limits to know

- Conditions compare the values in the note; they cannot compare two fields with each other.
- There is no "not" over a group of conditions; use `notIn` or `exists: false` on one field, or a
  second rule with `unavailable`.
- Rules do not read dates in any special way: `in` compares text.
