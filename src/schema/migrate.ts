import type { Condition, Option, Rule } from './types';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turns a version 1 schema (per-field availability and byType lists) into version 2 (types on the
 * field, everything else as rules). Anything that is not a version 1 schema is returned untouched
 * so the parser can report what is wrong with it.
 */
export function migrateSchema(input: unknown): unknown {
	return upgradeVaultDirs(upgradeTagAxes(migrateV1(input)));
}

/** A folder source used to name one folder in `path`; it names a list in `paths` now. Applies to any version. */
function upgradeVaultDirs(input: unknown): unknown {
	if (!isRec(input) || !isRec(input.fields)) return input;
	let changed = false;
	const fields: Rec = {};
	for (const [key, raw] of Object.entries(input.fields)) {
		const source = isRec(raw) && isRec(raw.source) ? raw.source : undefined;
		if (source?.kind !== 'vault-dir' || typeof source.path !== 'string' || 'paths' in source) {
			fields[key] = raw;
			continue;
		}
		const { path, ...rest } = source;
		changed = true;
		fields[key] = { ...(raw as Rec), source: { ...rest, paths: path === '' ? [] : [path] } };
	}
	return changed ? { ...input, fields } : input;
}

/** Tag axes used to list their values as plain strings; they are options now. Applies to any version. */
function upgradeTagAxes(input: unknown): unknown {
	if (!isRec(input) || !isRec(input.fields)) return input;
	let changed = false;
	const fields: Rec = {};
	for (const [key, raw] of Object.entries(input.fields)) {
		const source = isRec(raw) && isRec(raw.source) ? raw.source : undefined;
		if (source?.kind !== 'tag-vocab' || !Array.isArray(source.axes)) {
			fields[key] = raw;
			continue;
		}
		const axes = source.axes.map((axis: unknown) => {
			if (!isRec(axis) || !Array.isArray(axis.values)) return axis;
			const values = axis.values.map((v: unknown) => (typeof v === 'string' ? { value: v } : v));
			if (values.some((v: unknown, i: number) => v !== (axis.values as unknown[])[i])) changed = true;
			return { ...axis, values };
		});
		fields[key] = { ...(raw as Rec), source: { ...source, axes } };
	}
	return changed ? { ...input, fields } : input;
}

function migrateV1(input: unknown): unknown {
	if (!isRec(input) || input.schemaVersion !== 1 || !isRec(input.fields)) return input;
	const fields: Rec = {};
	const rules: Rule[] = [];
	for (const [key, raw] of Object.entries(input.fields)) {
		if (!isRec(raw)) {
			fields[key] = raw;
			continue;
		}
		const { availability, source, ...rest } = raw;
		const def: Rec = { ...rest };
		if (isRec(availability) && Array.isArray(availability.types)) def.types = availability.types;
		const when = isRec(availability) && Array.isArray(availability.when) ? (availability.when as Condition[]) : [];
		if (when.length > 0) {
			rules.push({ id: `${key}-available`, match: 'all', when, then: [{ field: key, effect: 'available' }] });
		}
		if (isRec(source) && source.kind === 'static' && isRec(source.byType)) {
			const byType = source.byType as Record<string, Option[]>;
			const types = Object.keys(byType);
			if (!Array.isArray(def.types)) def.types = types;
			def.source = { kind: 'static', values: [...new Map(Object.values(byType).flat().map((o) => [o.value, o])).values()] };
			for (const [type, values] of Object.entries(byType)) {
				rules.push({
					id: `${key}-for-${type}`,
					match: 'all',
					when: [{ field: String(input.typeField), in: [type] }],
					then: [{ field: key, effect: 'values', values }],
				});
			}
		} else if (source !== undefined) {
			def.source = source;
		}
		fields[key] = def;
	}
	return { ...input, schemaVersion: 2, fields, rules };
}
