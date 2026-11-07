import type { CompiledSchema } from './compile';
import type { Condition, Option, Rule } from './types';

export type Props = Readonly<Record<string, unknown>>;

export type Availability =
	| { available: true }
	| { available: false; reason: 'type'; type: string; allowedTypes: string[] }
	| { available: false; reason: 'rule'; rule: Rule };

export function isEmpty(v: unknown): boolean {
	return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export function currentType(c: CompiledSchema, props: Props): string | undefined {
	const t = props[c.typeField];
	return typeof t === 'string' && c.typeValues.has(t) ? t : undefined;
}

export function holds(cond: Condition, props: Props): boolean {
	const raw = props[cond.field];
	if ('exists' in cond) return !isEmpty(raw) === cond.exists;
	const values = Array.isArray(raw) ? raw : [raw];
	const hit = values.some((v) => typeof v === 'string' && ('in' in cond ? cond.in : cond.notIn).includes(v));
	return 'in' in cond ? hit : !hit;
}

/** Rules read raw property values and never another field's availability, so rules cannot loop. */
export function ruleApplies(rule: Rule, props: Props): boolean {
	if (rule.when.length === 0) return true;
	return rule.match === 'all' ? rule.when.every((cond) => holds(cond, props)) : rule.when.some((cond) => holds(cond, props));
}

/**
 * A field is unavailable when its type limit excludes the note's type, or when any rule that
 * applies marks it unavailable. A rule that marks it available only matters for a field that
 * is unavailable by default (no rule says anything about it otherwise), so `available` effects
 * lift the default of an `unavailable` effect with the same condition set. An unknown type
 * never rules a type-limited field out.
 */
export function availabilityOf(c: CompiledSchema, key: string, props: Props): Availability {
	const types = c.fieldTypes.get(key);
	const type = currentType(c, props);
	if (types && type && !types.has(type)) {
		return { available: false, reason: 'type', type, allowedTypes: [...types] };
	}
	const entries = c.rulesByField.get(key) ?? [];
	const gates = entries.filter((e) => e.effect.effect === 'available');
	if (gates.length > 0 && !gates.some((e) => ruleApplies(e.rule, props))) {
		return { available: false, reason: 'rule', rule: gates[0]!.rule };
	}
	for (const e of entries) {
		if (e.effect.effect === 'unavailable' && ruleApplies(e.rule, props)) return { available: false, reason: 'rule', rule: e.rule };
	}
	return { available: true };
}

/**
 * The legal values for a field. Every applying `values` rule narrows the list: a value must be
 * allowed by all of them (the intersection). With no applying rule, the field's own list is used.
 */
export function resolveOptions(c: CompiledSchema, key: string, props: Props): Option[] | undefined {
	const src = c.fields.get(key)?.source;
	if (src?.kind !== 'static') return undefined;
	const entries = c.rulesByField.get(key) ?? [];
	// A field whose values depend on rules has no single list to judge by until the note has a valid type.
	const dependsOnType = entries.some((e) => e.effect.effect === 'values' && e.rule.when.some((cond) => cond.field === c.typeField));
	if (dependsOnType && currentType(c, props) === undefined) return undefined;
	let options: Option[] = src.values;
	let narrowed = false;
	for (const e of entries) {
		if (e.effect.effect !== 'values' || !ruleApplies(e.rule, props)) continue;
		const allowed = new Set(e.effect.values.map((o) => o.value));
		options = narrowed ? options.filter((o) => allowed.has(o.value)) : e.effect.values;
		narrowed = true;
	}
	return options;
}

/** Every value a field may take, flattened, with its style. Tag vocabularies are expanded to `prefix/value`. */
export function styledOptions(c: CompiledSchema, key: string, props: Props): Option[] | undefined {
	const src = c.fields.get(key)?.source;
	if (src?.kind !== 'tag-vocab') return resolveOptions(c, key, props);
	return src.axes.flatMap((axis) => [
		...(axis.allowBare ? [{ ...axis.bare, value: axis.prefix }] : []),
		...axis.values.map((o) => ({ ...o, value: `${axis.prefix}/${o.value}` })),
	]);
}

export function missingFields(c: CompiledSchema, props: Props): string[] {
	const type = currentType(c, props);
	if (!type) return [];
	const out: string[] = [];
	for (const [key, def] of c.fields) {
		const types = c.fieldTypes.get(key);
		if (!(def.placeholder ?? types !== undefined)) continue;
		if (key in props) continue;
		if (types && !types.has(type)) continue;
		if (!availabilityOf(c, key, props).available) continue;
		out.push(key);
	}
	return out;
}
