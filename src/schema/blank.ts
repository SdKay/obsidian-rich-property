import { DEFAULT_SCHEMA } from './presets/default';
import type { Schema } from './types';

/**
 * What "start from nothing" means: only the type field, with no types yet, and no rules. The reserved
 * list of other plugins' fields is kept, or their properties would be flagged as unknown.
 */
export function blankSchema(): Schema {
	return {
		schemaVersion: 2,
		typeField: 'type',
		reserved: [...DEFAULT_SCHEMA.reserved],
		rules: [],
		fields: { type: { kind: 'enum', source: { kind: 'static', values: [] } } },
	};
}
