import { blankSchema } from './blank';
import { compileSchema, type CompiledSchema } from './compile';
import { parseSchema } from './parse';
import { DEFAULT_SCHEMA } from './presets/default';
import type { Schema } from './types';

export interface ActiveSchema {
	compiled: CompiledSchema;
	errors: string[];
	/** True when no saved rules are in use: the built-in preset, or an empty start. */
	usingStart: boolean;
}

/** The rules a start from `blank` or from the built-in preset begins with. */
export function startingSchema(blank: boolean): Schema {
	return blank ? blankSchema() : DEFAULT_SCHEMA;
}

/** Never throws: damaged saved rules fall back to the starting rules and say why. */
export function resolveSchema(saved: unknown, blank = false): ActiveSchema {
	const start = startingSchema(blank);
	if (saved === null || saved === undefined) return { compiled: compileSchema(start), errors: [], usingStart: true };
	const parsed = parseSchema(saved);
	if (parsed.ok) return { compiled: compileSchema(parsed.schema), errors: [], usingStart: false };
	return { compiled: compileSchema(start), errors: parsed.errors, usingStart: true };
}
