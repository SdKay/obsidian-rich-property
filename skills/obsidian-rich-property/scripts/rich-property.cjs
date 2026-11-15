"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/rich-property-cli.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/schema/presets/default.ts
var TYPES = [
  "capture",
  "reference",
  "output",
  "decision",
  "task",
  "devlog",
  "solution",
  "period",
  "knowledge",
  "brief",
  "moc",
  "rules"
];
var PLAIN = "purple";
var opt = (value, color, description) => ({
  value,
  ...color ? { color } : {},
  ...description ? { description: `i18n:val.${description}` } : {}
});
var plain = (values, group) => values.map((v) => opt(v, PLAIN, group ? `${group}.${v}` : void 0));
var enumOf = (values, extra = {}) => ({
  kind: "enum",
  source: { kind: "static", values },
  ...extra
});
var onTypes = (...types) => ({ types });
var STATUS_BY_TYPE = {
  brief: [opt("planned", "orange"), opt("active", "green"), opt("paused", "orange"), opt("done", "green")],
  solution: [opt("draft", "orange"), opt("stable", "green"), opt("superseded", "neutral")],
  task: [opt("todo", PLAIN), opt("doing", "blue"), opt("blocked", "red"), opt("done", "green")],
  decision: [opt("proposed", "orange"), opt("accepted", "green"), opt("superseded", "neutral")],
  output: [opt("draft", "orange"), opt("final", "green"), opt("superseded", "neutral")]
};
var STATUS_FALLBACK = Object.values(STATUS_BY_TYPE).flat().filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i);
var RULES = [
  {
    id: "review-needs-agent",
    match: "all",
    when: [{ field: "author", in: ["agent", "mixed"] }],
    then: [{ field: "review", effect: "available" }]
  },
  {
    id: "reviewed-needs-review",
    match: "all",
    when: [{ field: "review", in: ["reviewed", "changed"] }],
    then: [{ field: "reviewed", effect: "available" }]
  },
  ...Object.entries(STATUS_BY_TYPE).map(([type, values]) => ({
    id: `status-for-${type}`,
    match: "all",
    when: [{ field: "type", in: [type] }],
    then: [{ field: "status", effect: "values", values }]
  }))
];
var AI_EDIT = [opt("forbidden", "red", "edit.forbidden"), opt("ask", "orange", "edit.ask"), opt("allowed", "green", "edit.allowed")];
var AUDIENCE = [opt("ai", PLAIN, "audience.ai"), opt("both", PLAIN, "audience.both"), opt("human", "orange", "audience.human")];
var BUILT_IN = {
  schemaVersion: 2,
  typeField: "type",
  reserved: [
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
  rules: RULES,
  fields: {
    type: enumOf(plain(TYPES, "type")),
    review: enumOf([opt("none", "orange", "review.none"), opt("reviewed", "green", "review.reviewed"), opt("changed", "red", "review.changed")]),
    reviewed: { kind: "date" },
    author: enumOf(plain(["human", "agent", "mixed"])),
    audience: enumOf(AUDIENCE),
    "ai-edit": enumOf(AI_EDIT),
    tags: {
      kind: "tags",
      source: {
        kind: "tag-vocab",
        axes: [
          { label: "Wi-Fi", prefix: "wifi", values: plain(["p2p", "whc", "fw", "mesh", "dfs"]), allowBare: true, bare: { color: PLAIN } },
          { label: "Software component", prefix: "sw", values: plain(["zephyr", "freertos", "linux"]) },
          { label: "Architecture", prefix: "arch", values: plain(["arm", "riscv"]) },
          { label: "Hardware IP", prefix: "ip", values: plain(["sdio", "gspi", "uart", "dma", "cache", "flash", "mpu", "pmc", "otp", "ipc"]) },
          { label: "System", prefix: "sys", values: plain(["security", "power", "mcuboot", "bootloader", "tfm"]) },
          { label: "Misc", prefix: "misc", values: plain(["debug", "tools", "build", "test"]) }
        ]
      }
    },
    project: {
      kind: "enum",
      source: { kind: "vault-dir", paths: ["2-projects"], requireFile: "brief.md", depth: 2 },
      ...onTypes("brief", "solution", "task", "decision", "devlog", "output")
    },
    "project-mode": enumOf([opt("full", "neutral", "project-mode.full"), opt("light", "cyan", "project-mode.light")], { ...onTypes("brief"), placeholder: true }),
    customer: { kind: "text", ...onTypes("brief") },
    platform: { kind: "text-list", ...onTypes("brief") },
    status: {
      kind: "enum",
      source: { kind: "static", values: STATUS_FALLBACK },
      ...onTypes("brief", "solution", "task", "decision", "output")
    },
    priority: enumOf([opt("low", PLAIN), opt("medium", "orange"), opt("high", "red")], onTypes("task")),
    supersedes: { kind: "link", source: { kind: "note-search", folders: ["decisions", "output"] }, ...onTypes("decision", "output") },
    superseded_by: { kind: "link", source: { kind: "note-search", folders: ["decisions", "output"] }, ...onTypes("decision", "output") },
    related: { kind: "link-list", source: { kind: "note-search" }, ...onTypes("solution", "task", "decision", "output") },
    "verified-at": {
      kind: "text-list",
      pattern: "^[^@\\s]+@[^:\\s]+:[0-9a-f]{10}$",
      patternHint: "<repo>@<branch>:<10 hex>",
      ...onTypes("solution")
    },
    date: { kind: "date", ...onTypes("devlog") },
    tasks: { kind: "link-list", source: { kind: "note-search" }, ...onTypes("devlog") },
    range: { kind: "date-range", ...onTypes("period") },
    deadline: { kind: "date", ...onTypes("brief", "task") },
    "dir-accepts": { kind: "multi-enum", source: { kind: "static", values: plain(TYPES, "type") }, ...onTypes("rules") },
    "dir-audience": enumOf(AUDIENCE, onTypes("rules")),
    "dir-ai-edit": enumOf(AI_EDIT, onTypes("rules")),
    "dir-ai-create": enumOf(AI_EDIT, onTypes("rules")),
    "dir-review": { kind: "bool", ...onTypes("rules") },
    "dir-lifecycle": enumOf([opt("active", PLAIN), opt("archived", "neutral", "lifecycle.archived")], onTypes("rules")),
    created: { kind: "datetime" },
    updated: { kind: "datetime" },
    schema: { kind: "int" }
  }
};
var DESCRIBED = [
  "type",
  "created",
  "updated",
  "tags",
  "author",
  "audience",
  "ai-edit",
  "review",
  "reviewed",
  "schema",
  "project",
  "project-mode",
  "customer",
  "platform",
  "verified-at",
  "status",
  "priority",
  "deadline",
  "date",
  "range",
  "related",
  "tasks",
  "supersedes",
  "superseded_by",
  "dir-accepts",
  "dir-audience",
  "dir-ai-edit",
  "dir-ai-create",
  "dir-review",
  "dir-lifecycle"
];
var DEFAULT_SCHEMA = {
  ...BUILT_IN,
  fields: Object.fromEntries(
    Object.entries(BUILT_IN.fields).map(([key, def]) => [key, DESCRIBED.includes(key) ? { ...def, description: `i18n:desc.${key}` } : def])
  )
};

// src/schema/blank.ts
function blankSchema() {
  return {
    schemaVersion: 2,
    typeField: "type",
    reserved: [...DEFAULT_SCHEMA.reserved],
    rules: [],
    fields: { type: { kind: "enum", source: { kind: "static", values: [] } } }
  };
}

// src/schema/migrate.ts
var isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function migrateSchema(input) {
  return upgradeVaultDirs(upgradeTagAxes(migrateV1(input)));
}
function upgradeVaultDirs(input) {
  if (!isRec(input) || !isRec(input.fields)) return input;
  let changed = false;
  const fields = {};
  for (const [key, raw] of Object.entries(input.fields)) {
    const source = isRec(raw) && isRec(raw.source) ? raw.source : void 0;
    if (source?.kind !== "vault-dir" || typeof source.path !== "string" || "paths" in source) {
      fields[key] = raw;
      continue;
    }
    const { path: path2, ...rest2 } = source;
    changed = true;
    fields[key] = { ...raw, source: { ...rest2, paths: path2 === "" ? [] : [path2] } };
  }
  return changed ? { ...input, fields } : input;
}
function upgradeTagAxes(input) {
  if (!isRec(input) || !isRec(input.fields)) return input;
  let changed = false;
  const fields = {};
  for (const [key, raw] of Object.entries(input.fields)) {
    const source = isRec(raw) && isRec(raw.source) ? raw.source : void 0;
    if (source?.kind !== "tag-vocab" || !Array.isArray(source.axes)) {
      fields[key] = raw;
      continue;
    }
    const axes = source.axes.map((axis) => {
      if (!isRec(axis) || !Array.isArray(axis.values)) return axis;
      const values = axis.values.map((v) => typeof v === "string" ? { value: v } : v);
      if (values.some((v, i) => v !== axis.values[i])) changed = true;
      return { ...axis, values };
    });
    fields[key] = { ...raw, source: { ...source, axes } };
  }
  return changed ? { ...input, fields } : input;
}
function migrateV1(input) {
  if (!isRec(input) || input.schemaVersion !== 1 || !isRec(input.fields)) return input;
  const fields = {};
  const rules = [];
  for (const [key, raw] of Object.entries(input.fields)) {
    if (!isRec(raw)) {
      fields[key] = raw;
      continue;
    }
    const { availability, source, ...rest2 } = raw;
    const def = { ...rest2 };
    if (isRec(availability) && Array.isArray(availability.types)) def.types = availability.types;
    const when = isRec(availability) && Array.isArray(availability.when) ? availability.when : [];
    if (when.length > 0) {
      rules.push({ id: `${key}-available`, match: "all", when, then: [{ field: key, effect: "available" }] });
    }
    if (isRec(source) && source.kind === "static" && isRec(source.byType)) {
      const byType = source.byType;
      const types = Object.keys(byType);
      if (!Array.isArray(def.types)) def.types = types;
      def.source = { kind: "static", values: [...new Map(Object.values(byType).flat().map((o) => [o.value, o])).values()] };
      for (const [type, values] of Object.entries(byType)) {
        rules.push({
          id: `${key}-for-${type}`,
          match: "all",
          when: [{ field: String(input.typeField), in: [type] }],
          then: [{ field: key, effect: "values", values }]
        });
      }
    } else if (source !== void 0) {
      def.source = source;
    }
    fields[key] = def;
  }
  return { ...input, schemaVersion: 2, fields, rules };
}

// src/schema/types.ts
var FIELD_KINDS = [
  "enum",
  "multi-enum",
  "bool",
  "date",
  "datetime",
  "date-range",
  "link",
  "link-list",
  "int",
  "text",
  "text-list",
  "tags"
];
var COLOR_TOKENS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "neutral"];

// src/schema/parse.ts
var isRec2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isStrArr = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
var SOURCE_REQUIRED = ["enum", "multi-enum"];
function checkOptions(where, v, errors, allowEmpty = false) {
  if (!Array.isArray(v) || v.length === 0 && !allowEmpty) {
    errors.push(`${where}: must be a non-empty array`);
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  v.forEach((o, i) => {
    if (!isRec2(o) || typeof o.value !== "string" || o.value === "") {
      errors.push(`${where}[${i}]: needs a non-empty string "value"`);
      return;
    }
    if (seen.has(o.value)) errors.push(`${where}: duplicate value "${o.value}"`);
    seen.add(o.value);
    if (o.color !== void 0 && !COLOR_TOKENS.includes(o.color)) {
      errors.push(`${where}[${i}]: unknown color ${JSON.stringify(o.color)}`);
    }
    if (o.solid !== void 0 && typeof o.solid !== "boolean") errors.push(`${where}[${i}]: "solid" must be true or false`);
    if (o.description !== void 0 && typeof o.description !== "string") errors.push(`${where}[${i}]: "description" must be a string`);
  });
  return [...seen];
}
function checkAxes(where, axes, errors) {
  if (!Array.isArray(axes) || axes.length === 0) {
    errors.push(`${where}: tag-vocab needs a non-empty "axes" array`);
    return;
  }
  axes.forEach((a, i) => {
    const at = `${where}.axes[${i}]`;
    if (!isRec2(a)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    if (typeof a.label !== "string" || a.label === "") errors.push(`${at}: needs a non-empty string "label"`);
    if (typeof a.prefix !== "string" || a.prefix === "") errors.push(`${at}: needs a non-empty string "prefix"`);
    if (!Array.isArray(a.values)) errors.push(`${at}: "values" must be an array`);
    else if (a.values.length > 0) checkOptions(`${at}.values`, a.values, errors);
    if (a.bare !== void 0 && !isRec2(a.bare)) errors.push(`${at}: "bare" must be an object`);
    if (a.allowBare !== void 0 && typeof a.allowBare !== "boolean") errors.push(`${at}: "allowBare" must be a boolean`);
  });
}
function checkSource(where, src, errors, allowEmpty = false) {
  if (!isRec2(src)) {
    errors.push(`${where}: source must be an object`);
    return;
  }
  switch (src.kind) {
    case "static": {
      checkOptions(`${where}.values`, src.values, errors, allowEmpty);
      break;
    }
    case "vault-dir":
      if (!isStrArr(src.paths) || src.paths.some((x) => x.trim() === "")) errors.push(`${where}: vault-dir needs "paths", a list of folder paths`);
      if (src.requireFile !== void 0 && (typeof src.requireFile !== "string" || src.requireFile.trim() === "")) errors.push(`${where}: "requireFile" must be a file name`);
      if (src.depth !== void 0 && (!Number.isInteger(src.depth) || src.depth < 1 || src.depth > 3)) errors.push(`${where}: "depth" must be a whole number from 1 to 3`);
      break;
    case "tag-vocab":
      checkAxes(where, src.axes, errors);
      break;
    case "note-search":
      if (src.folder !== void 0 && typeof src.folder !== "string") errors.push(`${where}: "folder" must be a string`);
      if (src.folders !== void 0 && (!isStrArr(src.folders) || src.folders.length === 0 || src.folders.some((x) => x.trim() === ""))) errors.push(`${where}: "folders" must be a non-empty list of folder names`);
      break;
    default:
      errors.push(`${where}: unknown source kind "${String(src.kind)}"`);
  }
}
function checkRules(rules, fieldKeys, fields, errors) {
  const ids = /* @__PURE__ */ new Set();
  rules.forEach((r, i) => {
    const at = `rules[${i}]`;
    if (!isRec2(r)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    if (typeof r.id !== "string" || r.id === "") errors.push(`${at}: needs a non-empty string "id"`);
    else if (ids.has(r.id)) errors.push(`${at}: duplicate id "${r.id}"`);
    else ids.add(r.id);
    if (r.match !== "all" && r.match !== "any") errors.push(`${at}: "match" must be "all" or "any"`);
    if (!Array.isArray(r.when)) errors.push(`${at}: "when" must be an array`);
    else r.when.forEach((c, j) => checkCondition(`${at}.when[${j}]`, c, fieldKeys, errors));
    if (!Array.isArray(r.then) || r.then.length === 0) {
      errors.push(`${at}: "then" must be a non-empty array`);
      return;
    }
    r.then.forEach((e, j) => {
      const where = `${at}.then[${j}]`;
      if (!isRec2(e) || typeof e.field !== "string") return void errors.push(`${where}: needs a "field"`);
      if (!fieldKeys.has(e.field)) errors.push(`${where}: unknown field "${e.field}"`);
      if (e.effect === "values") checkOptions(`${where}.values`, e.values, errors);
      else if (e.effect !== "available" && e.effect !== "unavailable") errors.push(`${where}: unknown effect ${JSON.stringify(e.effect)}`);
      else if (isRec2(fields[e.field]) && fields[e.field].kind === void 0) errors.push(`${where}: field has no kind`);
    });
  });
}
function checkCondition(where, c, fieldKeys, errors) {
  if (!isRec2(c) || typeof c.field !== "string") {
    errors.push(`${where}: condition needs a "field"`);
    return;
  }
  if (!fieldKeys.has(c.field)) errors.push(`${where}: condition references unknown field "${c.field}"`);
  const ok = isStrArr(c.in) || isStrArr(c.notIn) || typeof c.exists === "boolean";
  if (!ok) errors.push(`${where}: condition needs one of "in", "notIn" or "exists"`);
}
function parseSchema(raw) {
  const errors = [];
  const input = migrateSchema(raw);
  if (!isRec2(input)) return { ok: false, errors: ["schema must be an object"] };
  if (input.schemaVersion !== 2) errors.push(`schemaVersion must be 2, got ${String(input.schemaVersion)}`);
  if (typeof input.typeField !== "string" || input.typeField === "") errors.push("typeField must be a non-empty string");
  if (!isStrArr(input.reserved)) errors.push("reserved must be an array of strings");
  if (!isRec2(input.fields)) {
    errors.push("fields must be an object");
    return { ok: false, errors };
  }
  const fields = input.fields;
  const fieldKeys = new Set(Object.keys(fields));
  const typeDef = typeof input.typeField === "string" ? fields[input.typeField] : void 0;
  const typeValues = /* @__PURE__ */ new Set();
  if (!isRec2(typeDef) || typeDef.kind !== "enum" || !isRec2(typeDef.source) || typeDef.source.kind !== "static" || !Array.isArray(typeDef.source.values)) {
    errors.push(`the type field "${String(input.typeField)}" must exist as an enum with a static "values" list`);
  } else {
    for (const o of typeDef.source.values) {
      if (isRec2(o) && typeof o.value === "string") typeValues.add(o.value);
    }
  }
  for (const [key, def] of Object.entries(fields)) {
    const where = `fields.${key}`;
    if (!isRec2(def)) {
      errors.push(`${where}: must be an object`);
      continue;
    }
    if (!FIELD_KINDS.includes(def.kind)) {
      errors.push(`${where}: unknown kind "${String(def.kind)}"`);
      continue;
    }
    const needsSource = SOURCE_REQUIRED.includes(def.kind);
    if (def.source !== void 0) checkSource(`${where}.source`, def.source, errors, key === input.typeField);
    else if (needsSource) errors.push(`${where}: kind "${String(def.kind)}" needs a source`);
    if (def.placeholder !== void 0 && typeof def.placeholder !== "boolean") errors.push(`${where}.placeholder: must be true or false`);
    if (def.pattern !== void 0) {
      if (typeof def.pattern !== "string") errors.push(`${where}.pattern: must be a string`);
      else if (def.kind !== "text" && def.kind !== "text-list") errors.push(`${where}.pattern: only applies to the text and text-list kinds, not ${String(def.kind)}`);
      else {
        try {
          new RegExp(def.pattern);
        } catch (err) {
          errors.push(`${where}.pattern: not a valid regular expression (${err.message})`);
        }
      }
    }
    if (def.patternHint !== void 0 && typeof def.patternHint !== "string") errors.push(`${where}.patternHint: must be a string`);
    if (def.description !== void 0 && typeof def.description !== "string") errors.push(`${where}.description: must be a string`);
    if (def.types !== void 0) {
      if (!isStrArr(def.types)) errors.push(`${where}.types: must be an array of strings`);
      else for (const t of def.types) if (!typeValues.has(t)) errors.push(`${where}.types: type "${t}" is not a value of the type field`);
    }
  }
  if (!Array.isArray(input.rules)) errors.push("rules must be an array");
  else checkRules(input.rules, fieldKeys, fields, errors);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, schema: input };
}

// scripts/rich-property-cli.ts
var USAGE = `rich-property: check and install property rules for the Rich Property plugin

  preset [--blank]                 print the built-in rules (or the empty start) as JSON
  validate <rules.json>            check a rules file; exit 1 and list every problem if it is not valid
  install  <rules.json> <vault> [--blank]
                                   check, then write the rules into <vault>/.obsidian/plugins/rich-property/data.json
                                   (the built-in start by default, the "start from scratch" slot with --blank).
                                   The old file is copied to data.json.bak first. Close the plugin in Obsidian
                                   before running this, or Obsidian may write its old settings back.
`;
function readJson(file) {
  try {
    return JSON.parse(import_node_fs.default.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`cannot read ${file} as JSON: ${err.message}`);
    process.exit(2);
  }
}
function check(rules) {
  const result = parseSchema(rules);
  if (result.ok) return;
  console.error(`${result.errors.length} problem(s):`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
var [command, ...rest] = process.argv.slice(2);
var flags = rest.filter((a) => a.startsWith("--"));
var args = rest.filter((a) => !a.startsWith("--"));
var blank = flags.includes("--blank");
if (command === "preset") {
  console.log(JSON.stringify(blank ? blankSchema() : DEFAULT_SCHEMA, null, 2));
} else if (command === "validate" && args[0]) {
  check(readJson(args[0]));
  console.log("valid");
} else if (command === "install" && args[0] && args[1]) {
  const rules = readJson(args[0]);
  check(rules);
  const dir = import_node_path.default.join(args[1], ".obsidian", "plugins", "rich-property");
  if (!import_node_fs.default.existsSync(dir)) {
    console.error(`${dir} does not exist: install and enable the Rich Property plugin in that vault first`);
    process.exit(2);
  }
  const file = import_node_path.default.join(dir, "data.json");
  const existed = import_node_fs.default.existsSync(file);
  const current = existed ? readJson(file) : {};
  if (existed) import_node_fs.default.copyFileSync(file, `${file}.bak`);
  const next = { ...current, ...blank ? { blank: true, blankSchema: rules } : { customSchema: rules } };
  import_node_fs.default.writeFileSync(file, JSON.stringify(next, null, 2));
  console.log(`wrote ${blank ? "blankSchema" : "customSchema"} to ${file}${existed ? " (previous file kept as data.json.bak)" : ""}`);
  console.log("Reload the plugin in Obsidian (Settings > Community plugins, switch Rich Property off and on) to use it.");
} else {
  console.log(USAGE);
  process.exit(command ? 2 : 0);
}
