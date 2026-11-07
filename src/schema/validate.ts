import type { CompiledSchema } from './compile';
import { availabilityOf, currentType, isEmpty, missingFields, resolveOptions, type Props } from './evaluate';
import type { FieldKind, FieldReport, NoteReport } from './types';

const PATTERNS: Partial<Record<FieldKind, { re: RegExp; format: string }>> = {
	date: { re: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
	datetime: { re: /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/, format: 'YYYY-MM-DD' },
	'date-range': { re: /^\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD ~ YYYY-MM-DD' },
};

const ok = (): FieldReport => ({ state: 'ok' });

// Link, tag and text values are not format-checked here: unquoted [[x]] parses as a nested array
// in YAML, and tags and links belong to a later milestone. Leaving them alone avoids false alarms.
function checkValue(c: CompiledSchema, key: string, kind: FieldKind, value: unknown, props: Props): FieldReport {
	const pattern = PATTERNS[kind];
	if (pattern) {
		return typeof value === 'string' && pattern.re.test(value) ? ok() : { state: 'invalid-value', allowed: [], format: pattern.format };
	}
	const own = c.fields.get(key);
	if (own?.pattern !== undefined && (kind === 'text' || kind === 'text-list')) {
		const re = new RegExp(own.pattern);
		const items = Array.isArray(value) ? value : [value];
		const matches = items.every((item) => typeof item === 'string' && re.test(item));
		if (!matches) return { state: 'invalid-value', allowed: [], format: own.patternHint ?? own.pattern };
	}
	switch (kind) {
		case 'text-list':
			return Array.isArray(value) && value.every((item) => typeof item === 'string') ? ok() : { state: 'invalid-value', allowed: [], format: 'a list of text' };
		case 'bool':
			return typeof value === 'boolean' ? ok() : { state: 'invalid-value', allowed: ['true', 'false'] };
		case 'int':
			return Number.isInteger(value) ? ok() : { state: 'invalid-value', allowed: [], format: 'integer' };
		case 'enum':
		case 'multi-enum': {
			const options = resolveOptions(c, key, props);
			if (!options) return ok();
			const allowed = options.map((o) => o.value);
			const values = kind === 'multi-enum' && Array.isArray(value) ? value : [value];
			const legal = values.every((v) => typeof v === 'string' && allowed.includes(v));
			return legal ? ok() : { state: 'invalid-value', allowed };
		}
		default:
			return ok();
	}
}

function reportFor(c: CompiledSchema, key: string, value: unknown, props: Props): FieldReport {
	if (c.reserved.has(key)) return { state: 'reserved' };
	const def = c.fields.get(key);
	if (!def) return { state: 'unknown-field' };
	const a = availabilityOf(c, key, props);
	if (!a.available) {
		return a.reason === 'type'
			? { state: 'type-mismatch', type: a.type, allowedTypes: a.allowedTypes }
			: { state: 'condition-unmet', rule: a.rule };
	}
	return isEmpty(value) ? ok() : checkValue(c, key, def.kind, value, props);
}

export function validateNote(c: CompiledSchema, props: Props): NoteReport {
	const fields: Record<string, FieldReport> = Object.create(null) as Record<string, FieldReport>;
	for (const [key, value] of Object.entries(props)) fields[key] = reportFor(c, key, value, props);
	const rawType = props[c.typeField];
	return {
		type: { value: typeof rawType === 'string' && !isEmpty(rawType) ? rawType : undefined, valid: currentType(c, props) !== undefined },
		fields,
		missing: missingFields(c, props),
	};
}
