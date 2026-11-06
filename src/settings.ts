/** Everything the user can configure. Persisted through `loadData` / `saveData`. */
export interface RichPropertySettings {
	/** Placeholder so the load/merge path has something to carry; replaced by the first real setting. */
	version: number;
}

/**
 * Defaults for a first run. A saved file from an older version may lack newer keys:
 * always merge it over these (see `loadSettings`), and only ever ADD keys, never rename
 * or repurpose one, so an upgrade cannot misread what a user already saved.
 */
export const DEFAULT_SETTINGS: RichPropertySettings = {
	version: 1,
};

/** Merges saved data over the defaults. Anything saved with the wrong type falls back to the default. */
export function loadSettings(saved: Partial<RichPropertySettings> | null | undefined): RichPropertySettings {
	return {
		version: typeof saved?.version === 'number' ? saved.version : DEFAULT_SETTINGS.version,
	};
}
