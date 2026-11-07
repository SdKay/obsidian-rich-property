import type { Effect, FieldDef, Rule, Schema } from './types';

export interface CompiledSchema {
	readonly schema: Schema;
	readonly typeField: string;
	readonly reserved: ReadonlySet<string>;
	readonly fields: ReadonlyMap<string, FieldDef>;
	readonly typeValues: ReadonlySet<string>;
	/** Field key to the types it is limited to. A key that is absent is available under every type. */
	readonly fieldTypes: ReadonlyMap<string, ReadonlySet<string>>;
	/** Rules grouped by the field their effects name, so a lookup does not scan every rule. */
	readonly rulesByField: ReadonlyMap<string, readonly { rule: Rule; effect: Effect }[]>;
}

/** `schema` must already have passed `parseSchema`. */
export function compileSchema(schema: Schema): CompiledSchema {
	const fields = new Map(Object.entries(schema.fields));
	const typeDef = schema.fields[schema.typeField];
	const typeValues = new Set((typeDef?.source?.kind === 'static' ? typeDef.source.values : []).map((o) => o.value));

	const fieldTypes = new Map<string, ReadonlySet<string>>();
	for (const [key, def] of fields) if (def.types) fieldTypes.set(key, new Set(def.types));

	const rulesByField = new Map<string, { rule: Rule; effect: Effect }[]>();
	for (const rule of schema.rules) {
		for (const effect of rule.then) {
			const list = rulesByField.get(effect.field) ?? [];
			list.push({ rule, effect });
			rulesByField.set(effect.field, list);
		}
	}

	return { schema, typeField: schema.typeField, reserved: new Set(schema.reserved), fields, typeValues, fieldTypes, rulesByField };
}
