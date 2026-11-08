// The ONLY place that knows the shape of Obsidian's native property panel. Selectors come from
// real captures in test/fixtures/dom/. When Obsidian changes the panel, change this file only.
// Every function tolerates a missing structure by returning nothing.

export interface PropertyRow {
	key: string;
	row: HTMLElement;
	value: HTMLElement | null;
}

const CONTAINER = '.metadata-container';
const ROW = '.metadata-property[data-property-key]';
const VALUE = '.metadata-property-value';

export function findContainers(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(CONTAINER));
}

/** The tag-style pills inside a list value, with the text each one shows. */
export function pillsOf(value: HTMLElement | null): { el: HTMLElement; text: string }[] {
	if (!value) return [];
	return Array.from(value.querySelectorAll<HTMLElement>('.multi-select-pill')).map((el) => ({
		el,
		text: (el.querySelector('.multi-select-pill-content')?.textContent ?? '').trim(),
	}));
}

export function rowsOf(container: HTMLElement): PropertyRow[] {
	const out: PropertyRow[] = [];
	for (const row of Array.from(container.querySelectorAll<HTMLElement>(ROW))) {
		const key = row.getAttribute('data-property-key');
		if (key) out.push({ key, row, value: row.querySelector<HTMLElement>(VALUE) });
	}
	return out;
}

/** Parts of a value that react to a click themselves; stealing the click would break following a link or deleting a pill. */
const OWN_CLICK = '.internal-link, .external-link, .metadata-link-inner, .metadata-link-flair, .multi-select-pill';

export type Zone = 'value' | 'row-self' | 'other';

export interface RowHit extends PropertyRow {
	zone: Zone;
}

/** Duck-typed on purpose: `instanceof Element` is unreliable across Obsidian windows. */
export function rowFromTarget(target: EventTarget | null): RowHit | null {
	const el = target as Element | null;
	if (!el || typeof el.closest !== 'function') return null;
	const row = el.closest<HTMLElement>(ROW);
	const key = row?.getAttribute('data-property-key');
	if (!row || !key || !row.closest(CONTAINER)) return null;
	const value = row.querySelector<HTMLElement>(VALUE);
	const inValue = value?.contains(el) === true;
	// Inside the value, a link, a pill or its remove button does its own job (open, select, delete): leave it alone.
	const zone: Zone = inValue ? (el.closest(OWN_CLICK) ? 'other' : 'value') : el === row ? 'row-self' : 'other';
	return { key, row, value, zone };
}

export function contentOf(container: HTMLElement): HTMLElement | null {
	return container.querySelector<HTMLElement>('.metadata-content');
}
