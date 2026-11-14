export const FIELD_KINDS = [
	'enum', 'multi-enum', 'bool', 'date', 'datetime', 'date-range',
	'link', 'link-list', 'int', 'text', 'text-list', 'tags',
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const COLOR_TOKENS = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'neutral'] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export interface Option {
	value: string;
	color?: ColorToken;
	/** Show the color as a filled block instead of tinted text. */
	solid?: boolean;
	/** What the value means; shown next to it in menus. */
	description?: string;
}

export interface TagAxis {
	label: string;
	prefix: string;
	/** The values after the prefix, each with the same color, fill and description options as any value. */
	values: Option[];
	allowBare?: boolean;
	/** Style for the bare prefix itself (`wifi`), when allowBare is on. */
	bare?: Omit<Option, 'value'>;
}

export type ValueSource =
	| { kind: 'static'; values: Option[] }
	/**
	 * The folders inside each of these vault folders, written as the path from that folder (`app`, `app/web`).
	 * `depth` is how many levels to read (default 1). With `requireFile`, only folders that contain that file count.
	 */
	| { kind: 'vault-dir'; paths: string[]; requireFile?: string; depth?: number }
	| { kind: 'tag-vocab'; axes: TagAxis[] }
	/** Notes to search: those under `folder`, or under any of `folders`; with neither, every note. */
	| { kind: 'note-search'; folder?: string; folders?: string[] };

export type Condition =
	| { field: string; in: string[] }
	| { field: string; notIn: string[] }
	| { field: string; exists: boolean };

export interface FieldDef {
	kind: FieldKind;
	/** Shown in the settings list; never affects validation. */
	description?: string;
	source?: ValueSource;
	/** The note types this field applies to. Absent means every type. */
	types?: string[];
	/** A regular expression every value (every item of a list) must match. Checked on text, text-list and the like. */
	pattern?: string;
	/** The format in words, shown when a value does not match `pattern`, such as `<repo>@<branch>:<10 hex>`. */
	patternHint?: string;
	placeholder?: boolean;
}

export type Effect =
	| { field: string; effect: 'available' }
	| { field: string; effect: 'unavailable' }
	| { field: string; effect: 'values'; values: Option[] };

/** When the conditions hold (all of them, or any one), the effects apply to the named fields. */
export interface Rule {
	id: string;
	match: 'all' | 'any';
	when: Condition[];
	then: Effect[];
}

export interface Schema {
	schemaVersion: 2;
	typeField: string;
	fields: Record<string, FieldDef>;
	rules: Rule[];
	reserved: string[];
}

export type FieldReport =
	| { state: 'ok' }
	| { state: 'invalid-value'; allowed: string[]; format?: string }
	| { state: 'unknown-field' }
	| { state: 'type-mismatch'; type: string; allowedTypes: string[] }
	| { state: 'condition-unmet'; rule: Rule }
	| { state: 'reserved' };

export interface NoteReport {
	type: { value: string | undefined; valid: boolean };
	fields: Record<string, FieldReport>;
	missing: string[];
}
