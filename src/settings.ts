/** Everything the user can configure. Persisted through `loadData` / `saveData`. */
export interface RichPropertySettings {
	version: number;
	/** Master switch for chips, warnings and placeholders. Off restores the native look. */
	styling: boolean;
	/** Start from nothing instead of the built-in types and rules. Reversible: what was saved is kept. */
	blank: boolean;
	/** The user's edits of the built-in rules, kept raw so a damaged one is reported but never lost. null means unchanged. */
	customSchema: unknown;
	/** The rules built from nothing. Kept apart from customSchema so switching `blank` never overwrites either. */
	blankSchema: unknown;
}

/**
 * Defaults for a first run. A saved file from an older version may lack newer keys:
 * always merge it over these (see `loadSettings`), and only ever ADD keys, never rename
 * or repurpose one, so an upgrade cannot misread what a user already saved.
 */
export const DEFAULT_SETTINGS: RichPropertySettings = {
	version: 1,
	styling: true,
	blank: false,
	customSchema: null,
	blankSchema: null,
};

/** Merges saved data over the defaults. Anything saved with the wrong type falls back to the default. */
export function loadSettings(saved: Partial<RichPropertySettings> | null | undefined): RichPropertySettings {
	return {
		version: typeof saved?.version === 'number' ? saved.version : DEFAULT_SETTINGS.version,
		styling: typeof saved?.styling === 'boolean' ? saved.styling : DEFAULT_SETTINGS.styling,
		blank: typeof saved?.blank === 'boolean' ? saved.blank : DEFAULT_SETTINGS.blank,
		customSchema: saved?.customSchema ?? DEFAULT_SETTINGS.customSchema,
		blankSchema: saved?.blankSchema ?? DEFAULT_SETTINGS.blankSchema,
	};
}

/** The saved rules for the current starting point. */
export function activeSlot(settings: RichPropertySettings): unknown {
	return settings.blank ? settings.blankSchema : settings.customSchema;
}

export function setActiveSlot(settings: RichPropertySettings, value: unknown): void {
	if (settings.blank) settings.blankSchema = value;
	else settings.customSchema = value;
}
