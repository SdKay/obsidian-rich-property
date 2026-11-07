import { parseSchema } from './parse';
import { startingSchema } from './load';
import type { Condition, Effect, FieldDef, FieldKind, Option, Rule, Schema, TagAxis } from './types';

/** The schema the user is editing: their saved one, or a copy of the built-in preset to start from. */
export function editableCopy(saved: unknown, blank = false): Schema {
	const parsed = saved === null || saved === undefined ? null : parseSchema(saved);
	return structuredClone(parsed?.ok ? parsed.schema : startingSchema(blank));
}

// ---- Properties ----

/** Where a single or multiple choice field gets its values: a list typed in, or the folders inside some vault folders. */
export type ListSource = 'list' | 'folders';

export interface FieldForm {
	key: string;
	kind: FieldKind;
	description: string;
	/** The field's own list of values. Used by the list kinds with a static list. */
	options: Option[];
	/** The axes of a tag vocabulary. Empty unless the field's source is one. */
	axes: TagAxis[];
	/** The vault folders a folder source reads. Kept while the user switches away, so switching back loses nothing. */
	paths: string[];
	/** Which of the two ways of getting values is chosen. Only meaningful for single and multiple choice fields. */
	listSource: ListSource;
	/** True when the field has a source with its own editor or none (tags, note search): the choice above is not offered. */
	fixedSource: boolean;
	/** Note types the field applies to; empty means every type. */
	types: string[];
}

export function formFor(schema: Schema, key: string): FieldForm {
	const def = schema.fields[key];
	return {
		key,
		kind: def?.kind ?? 'text',
		description: def?.description ?? '',
		options: def?.source?.kind === 'static' ? structuredClone(def.source.values) : [],
		axes: def?.source?.kind === 'tag-vocab' ? structuredClone(def.source.axes) : [],
		paths: def?.source?.kind === 'vault-dir' ? [...def.source.paths] : [],
		listSource: def?.source?.kind === 'vault-dir' ? 'folders' : 'list',
		fixedSource: def?.source !== undefined && def.source.kind !== 'static' && def.source.kind !== 'vault-dir',
		types: def?.types ?? [],
	};
}

const LISTED: FieldKind[] = ['enum', 'multi-enum'];

/** Returns the schema with this field replaced (or added). A source the form cannot express (directory, tags) is kept. */
export function applyForm(schema: Schema, form: FieldForm, previousKey?: string): Schema {
	const next = structuredClone(schema);
	const old = next.fields[previousKey ?? form.key];
	const def: FieldDef = { kind: form.kind };
	if (form.description) def.description = form.description;
	if (LISTED.includes(form.kind)) {
		if (form.fixedSource && old?.source) def.source = old.source;
		else if (form.listSource === 'folders') {
			const kept = old?.source?.kind === 'vault-dir' ? old.source : undefined;
			def.source = { kind: 'vault-dir', paths: form.paths };
			if (kept?.requireFile !== undefined) def.source.requireFile = kept.requireFile;
			if (kept?.depth !== undefined) def.source.depth = kept.depth;
		}
		else def.source = { kind: 'static', values: form.options };
	} else if (old?.source?.kind === 'tag-vocab' && form.kind === 'tags') {
		def.source = { kind: 'tag-vocab', axes: form.axes };
	} else if (old?.source && old.kind === form.kind) {
		def.source = old.source;
	}
	if (form.types.length > 0) def.types = form.types;
	if (old?.placeholder !== undefined) def.placeholder = old.placeholder;

	next.fields[form.key] = def;
	if (previousKey && previousKey !== form.key) {
		delete next.fields[previousKey];
		renameInRules(next, previousKey, form.key);
	}
	return next;
}

function renameInRules(schema: Schema, from: string, to: string): void {
	for (const rule of schema.rules) {
		for (const c of rule.when) if (c.field === from) c.field = to;
		for (const e of rule.then) if (e.field === from) e.field = to;
	}
}

/** Removes a field and every condition or effect that referred to it, dropping rules left with nothing to do. */
export function removeField(schema: Schema, key: string): Schema {
	const next = structuredClone(schema);
	delete next.fields[key];
	next.rules = next.rules
		.map((r) => ({ ...r, when: r.when.filter((c) => c.field !== key), then: r.then.filter((e) => e.field !== key) }))
		.filter((r) => r.then.length > 0);
	return next;
}

/** Adds a note type: a new value of the type field. */
export function addType(schema: Schema, name: string): Schema {
	const next = structuredClone(schema);
	const source = next.fields[next.typeField]?.source;
	if (source?.kind === 'static' && !source.values.some((o) => o.value === name)) source.values.push({ value: name });
	return next;
}

// ---- Rules ----

export type ConditionOp = 'in' | 'notIn' | 'exists' | 'notExists';
export type EffectKind = Effect['effect'];

export function newRule(schema: Schema): Rule {
	let n = schema.rules.length + 1;
	while (schema.rules.some((r) => r.id === `rule-${n}`)) n++;
	return { id: `rule-${n}`, match: 'all', when: [], then: [] };
}

export function opOf(c: Condition): ConditionOp {
	if ('in' in c) return 'in';
	if ('notIn' in c) return 'notIn';
	return c.exists ? 'exists' : 'notExists';
}

export function makeCondition(field: string, op: ConditionOp, values: string[]): Condition {
	if (op === 'in') return { field, in: values };
	if (op === 'notIn') return { field, notIn: values };
	return { field, exists: op === 'exists' };
}

export function conditionValues(c: Condition): string[] {
	if ('in' in c) return [...c.in];
	if ('notIn' in c) return [...c.notIn];
	return [];
}

export function makeEffect(field: string, kind: EffectKind, values: Option[]): Effect {
	if (kind === 'values') return { field, effect: 'values', values };
	return { field, effect: kind };
}

export function effectValues(e: Effect): Option[] {
	return e.effect === 'values' ? structuredClone(e.values) : [];
}

/** Replaces the rule with the same id, or appends it. */
export function putRule(schema: Schema, rule: Rule): Schema {
	const next = structuredClone(schema);
	const i = next.rules.findIndex((r) => r.id === rule.id);
	if (i >= 0) next.rules[i] = rule;
	else next.rules.push(rule);
	return next;
}

export function removeRule(schema: Schema, id: string): Schema {
	const next = structuredClone(schema);
	next.rules = next.rules.filter((r) => r.id !== id);
	return next;
}
