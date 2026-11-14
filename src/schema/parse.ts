import { migrateSchema } from './migrate';
import { COLOR_TOKENS, FIELD_KINDS, type ColorToken, type FieldKind, type Schema } from './types';

export type ParseResult = { ok: true; schema: Schema } | { ok: false; errors: string[] };

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const SOURCE_REQUIRED: FieldKind[] = ['enum', 'multi-enum'];

function checkOptions(where: string, v: unknown, errors: string[], allowEmpty = false): string[] {
	if (!Array.isArray(v) || (v.length === 0 && !allowEmpty)) {
		errors.push(`${where}: must be a non-empty array`);
		return [];
	}
	const seen = new Set<string>();
	v.forEach((o: unknown, i) => {
		if (!isRec(o) || typeof o.value !== 'string' || o.value === '') {
			errors.push(`${where}[${i}]: needs a non-empty string "value"`);
			return;
		}
		if (seen.has(o.value)) errors.push(`${where}: duplicate value "${o.value}"`);
		seen.add(o.value);
		if (o.color !== undefined && !COLOR_TOKENS.includes(o.color as ColorToken)) {
			errors.push(`${where}[${i}]: unknown color ${JSON.stringify(o.color)}`);
		}
		if (o.solid !== undefined && typeof o.solid !== 'boolean') errors.push(`${where}[${i}]: "solid" must be true or false`);
		if (o.description !== undefined && typeof o.description !== 'string') errors.push(`${where}[${i}]: "description" must be a string`);
	});
	return [...seen];
}

function checkAxes(where: string, axes: unknown, errors: string[]): void {
	if (!Array.isArray(axes) || axes.length === 0) {
		errors.push(`${where}: tag-vocab needs a non-empty "axes" array`);
		return;
	}
	axes.forEach((a: unknown, i) => {
		const at = `${where}.axes[${i}]`;
		if (!isRec(a)) {
			errors.push(`${at}: must be an object`);
			return;
		}
		if (typeof a.label !== 'string' || a.label === '') errors.push(`${at}: needs a non-empty string "label"`);
		if (typeof a.prefix !== 'string' || a.prefix === '') errors.push(`${at}: needs a non-empty string "prefix"`);
		if (!Array.isArray(a.values)) errors.push(`${at}: "values" must be an array`);
		else if (a.values.length > 0) checkOptions(`${at}.values`, a.values, errors);
		if (a.bare !== undefined && !isRec(a.bare)) errors.push(`${at}: "bare" must be an object`);
		if (a.allowBare !== undefined && typeof a.allowBare !== 'boolean') errors.push(`${at}: "allowBare" must be a boolean`);
	});
}

function checkSource(where: string, src: unknown, errors: string[], allowEmpty = false): void {
	if (!isRec(src)) {
		errors.push(`${where}: source must be an object`);
		return;
	}
	switch (src.kind) {
		case 'static': {
			checkOptions(`${where}.values`, src.values, errors, allowEmpty);
			break;
		}
		case 'vault-dir':
			if (!isStrArr(src.paths) || src.paths.some((x) => x.trim() === '')) errors.push(`${where}: vault-dir needs "paths", a list of folder paths`);
			if (src.requireFile !== undefined && (typeof src.requireFile !== 'string' || src.requireFile.trim() === '')) errors.push(`${where}: "requireFile" must be a file name`);
			if (src.depth !== undefined && (!Number.isInteger(src.depth) || (src.depth as number) < 1 || (src.depth as number) > 3)) errors.push(`${where}: "depth" must be a whole number from 1 to 3`);
			break;
		case 'tag-vocab':
			checkAxes(where, src.axes, errors);
			break;
		case 'note-search':
			if (src.folder !== undefined && typeof src.folder !== 'string') errors.push(`${where}: "folder" must be a string`);
			if (src.folders !== undefined && (!isStrArr(src.folders) || src.folders.length === 0 || src.folders.some((x) => x.trim() === ''))) errors.push(`${where}: "folders" must be a non-empty list of folder names`);
			break;
		default:
			errors.push(`${where}: unknown source kind "${String(src.kind)}"`);
	}
}

function checkRules(rules: unknown[], fieldKeys: Set<string>, fields: Rec, errors: string[]): void {
	const ids = new Set<string>();
	rules.forEach((r: unknown, i) => {
		const at = `rules[${i}]`;
		if (!isRec(r)) {
			errors.push(`${at}: must be an object`);
			return;
		}
		if (typeof r.id !== 'string' || r.id === '') errors.push(`${at}: needs a non-empty string "id"`);
		else if (ids.has(r.id)) errors.push(`${at}: duplicate id "${r.id}"`);
		else ids.add(r.id);
		if (r.match !== 'all' && r.match !== 'any') errors.push(`${at}: "match" must be "all" or "any"`);
		if (!Array.isArray(r.when)) errors.push(`${at}: "when" must be an array`);
		else r.when.forEach((c: unknown, j) => checkCondition(`${at}.when[${j}]`, c, fieldKeys, errors));
		if (!Array.isArray(r.then) || r.then.length === 0) {
			errors.push(`${at}: "then" must be a non-empty array`);
			return;
		}
		r.then.forEach((e: unknown, j) => {
			const where = `${at}.then[${j}]`;
			if (!isRec(e) || typeof e.field !== 'string') return void errors.push(`${where}: needs a "field"`);
			if (!fieldKeys.has(e.field)) errors.push(`${where}: unknown field "${e.field}"`);
			if (e.effect === 'values') checkOptions(`${where}.values`, e.values, errors);
			else if (e.effect !== 'available' && e.effect !== 'unavailable') errors.push(`${where}: unknown effect ${JSON.stringify(e.effect)}`);
			else if (isRec(fields[e.field]) && (fields[e.field] as Rec).kind === undefined) errors.push(`${where}: field has no kind`);
		});
	});
}

function checkCondition(where: string, c: unknown, fieldKeys: Set<string>, errors: string[]): void {
	if (!isRec(c) || typeof c.field !== 'string') {
		errors.push(`${where}: condition needs a "field"`);
		return;
	}
	if (!fieldKeys.has(c.field)) errors.push(`${where}: condition references unknown field "${c.field}"`);
	const ok = isStrArr(c.in) || isStrArr(c.notIn) || typeof c.exists === 'boolean';
	if (!ok) errors.push(`${where}: condition needs one of "in", "notIn" or "exists"`);
}

export function parseSchema(raw: unknown): ParseResult {
	const errors: string[] = [];
	const input = migrateSchema(raw);
	if (!isRec(input)) return { ok: false, errors: ['schema must be an object'] };

	if (input.schemaVersion !== 2) errors.push(`schemaVersion must be 2, got ${String(input.schemaVersion)}`);
	if (typeof input.typeField !== 'string' || input.typeField === '') errors.push('typeField must be a non-empty string');
	if (!isStrArr(input.reserved)) errors.push('reserved must be an array of strings');
	if (!isRec(input.fields)) {
		errors.push('fields must be an object');
		return { ok: false, errors };
	}

	const fields = input.fields;
	const fieldKeys = new Set(Object.keys(fields));
	const typeDef = typeof input.typeField === 'string' ? fields[input.typeField] : undefined;
	const typeValues = new Set<string>();
	if (!isRec(typeDef) || typeDef.kind !== 'enum' || !isRec(typeDef.source) || typeDef.source.kind !== 'static' || !Array.isArray(typeDef.source.values)) {
		errors.push(`the type field "${String(input.typeField)}" must exist as an enum with a static "values" list`);
	} else {
		for (const o of typeDef.source.values as unknown[]) {
			if (isRec(o) && typeof o.value === 'string') typeValues.add(o.value);
		}
	}

	for (const [key, def] of Object.entries(fields)) {
		const where = `fields.${key}`;
		if (!isRec(def)) {
			errors.push(`${where}: must be an object`);
			continue;
		}
		if (!FIELD_KINDS.includes(def.kind as FieldKind)) {
			errors.push(`${where}: unknown kind "${String(def.kind)}"`);
			continue;
		}
		const needsSource = SOURCE_REQUIRED.includes(def.kind as FieldKind);
		if (def.source !== undefined) checkSource(`${where}.source`, def.source, errors, key === input.typeField);
		else if (needsSource) errors.push(`${where}: kind "${String(def.kind)}" needs a source`);

		if (def.placeholder !== undefined && typeof def.placeholder !== 'boolean') errors.push(`${where}.placeholder: must be true or false`);
		if (def.pattern !== undefined) {
			if (typeof def.pattern !== 'string') errors.push(`${where}.pattern: must be a string`);
			else if (def.kind !== 'text' && def.kind !== 'text-list') errors.push(`${where}.pattern: only applies to the text and text-list kinds, not ${String(def.kind)}`);
			else {
				try {
					new RegExp(def.pattern);
				} catch (err) {
					errors.push(`${where}.pattern: not a valid regular expression (${(err as Error).message})`);
				}
			}
		}
		if (def.patternHint !== undefined && typeof def.patternHint !== 'string') errors.push(`${where}.patternHint: must be a string`);
		if (def.description !== undefined && typeof def.description !== 'string') errors.push(`${where}.description: must be a string`);
		if (def.types !== undefined) {
			if (!isStrArr(def.types)) errors.push(`${where}.types: must be an array of strings`);
			else for (const t of def.types) if (!typeValues.has(t)) errors.push(`${where}.types: type "${t}" is not a value of the type field`);
		}
	}

	if (!Array.isArray(input.rules)) errors.push('rules must be an array');
	else checkRules(input.rules, fieldKeys, fields, errors);

	return errors.length > 0 ? { ok: false, errors } : { ok: true, schema: input as unknown as Schema };
}
