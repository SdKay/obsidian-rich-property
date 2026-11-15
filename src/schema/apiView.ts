import type { CompiledSchema } from './compile';
import { resolveOptions, styledOptions } from './evaluate';
import type { PropertyField, PropertyValue, ValueType } from '../richPropertyApi';
import type { FieldKind, Option } from './types';

// A range is one string "A ~ B", so it is text and never a date.
const VALUE_TYPE: Record<FieldKind, ValueType> = {
	enum: 'text',
	text: 'text',
	link: 'text',
	'date-range': 'text',
	'multi-enum': 'list',
	'text-list': 'list',
	'link-list': 'list',
	tags: 'list',
	int: 'number',
	bool: 'boolean',
	date: 'date',
	datetime: 'datetime',
};

/** Every property the active rules know, except those owned by other plugins. `describe` turns a stored description into text. */
export function fieldsOf(c: CompiledSchema, describe: (stored: string | undefined) => string): PropertyField[] {
	return [...c.fields]
		.filter(([key]) => !c.reserved.has(key))
		.map(([key, def]) => {
			const description = describe(def.description);
			const types = c.fieldTypes.get(key);
			return {
				key,
				valueType: VALUE_TYPE[def.kind],
				...(description ? { description } : {}),
				...(types ? { types: [...types] } : {}),
			};
		});
}

function toValue(o: Option, describe: (stored: string | undefined) => string): PropertyValue {
	const description = describe(o.description);
	return {
		value: o.value,
		...(o.color ? { color: o.color } : {}),
		...(o.solid ? { solid: true } : {}),
		...(description ? { description } : {}),
	};
}

/**
 * The legal values of a field. With a `type` they are that type's; without one, or with a type the rules
 * do not know, they are the union over every type, first occurrence winning. `undefined` means the field
 * has no fixed list (text, dates, links). A bool is the two values it can take.
 * `folderValues` supplies the values of a folder source, which only the plugin can read from the vault.
 */
export function valuesOf(
	c: CompiledSchema,
	key: string,
	type: string | undefined,
	describe: (stored: string | undefined) => string,
	folderValues: (key: string) => Option[] | undefined,
): PropertyValue[] | undefined {
	const def = c.fields.get(key);
	if (!def || c.reserved.has(key)) return undefined;
	if (def.kind === 'bool') return [{ value: 'true' }, { value: 'false' }];
	const source = def.source;
	if (!source || source.kind === 'note-search') return undefined;
	if (source.kind === 'vault-dir') return folderValues(key)?.map((o) => toValue(o, describe));
	if (source.kind === 'tag-vocab') return styledOptions(c, key, {})?.map((o) => toValue(o, describe));

	const types = type !== undefined && c.typeValues.has(type) ? [type] : [...c.typeValues];
	// A field with no types still has one list; resolving once with no type gives it.
	const lists = types.length > 0 ? types.map((t) => resolveOptions(c, key, { [c.typeField]: t })) : [resolveOptions(c, key, {})];
	const seen = new Set<string>();
	const merged: Option[] = [];
	for (const list of lists) {
		for (const o of list ?? []) {
			if (seen.has(o.value)) continue;
			seen.add(o.value);
			merged.push(o);
		}
	}
	return merged.map((o) => toValue(o, describe));
}
