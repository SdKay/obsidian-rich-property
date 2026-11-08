import { pillsOf, rowsOf, type PropertyRow } from './domContract';
import { presentationStamp, type Presentation } from './present';

const STAMP = 'data-rp-stamp';
const STATE = 'data-rp-state';
const COLOR = 'data-rp-color';
const FILL = 'data-rp-fill';
const LIST = 'data-rp-list';

function reset(r: PropertyRow): void {
	r.row.removeAttribute(STAMP);
	r.row.removeAttribute(STATE);
	r.row.removeAttribute('aria-label');
	r.value?.removeAttribute(COLOR);
	r.value?.removeAttribute(FILL);
	r.value?.removeAttribute(LIST);
	for (const pill of pillsOf(r.value)) {
		pill.el.removeAttribute(COLOR);
		pill.el.removeAttribute(FILL);
	}
}

function pillsMatch(r: PropertyRow, p: Extract<Presentation, { kind: 'pills' }>): boolean {
	return pillsOf(r.value).every((pill) => {
		const item = p.items.find((i) => i.value === pill.text);
		return (pill.el.getAttribute(COLOR) ?? null) === (item?.color ?? null) && (pill.el.getAttribute(FILL) ?? null) === (item?.solid ? 'solid' : null);
	});
}

/** Idempotent: a row whose stamp already matches is left untouched, so our own writes never retrigger a redraw. */
export function decorateRow(r: PropertyRow, p: Presentation): void {
	const stamp = presentationStamp(p);
	const wantColor = p.kind === 'chip' ? (p.color ?? null) : null;
	const wantFill = p.kind === 'chip' && p.solid ? 'solid' : null;
	// The value element can be rebuilt while the row survives, so its attributes are checked as well as the stamp.
	const same = r.row.getAttribute(STAMP) === stamp;
	if (same && p.kind === 'pills' && pillsMatch(r, p)) return;
	if (same && p.kind !== 'pills' && (r.value?.getAttribute(COLOR) ?? null) === wantColor && (r.value?.getAttribute(FILL) ?? null) === wantFill) return;
	reset(r);
	if (p.kind === 'none') return;
	r.row.setAttribute(STAMP, stamp);
	if (p.kind === 'pills') {
		r.value?.setAttribute(LIST, '');
		for (const pill of pillsOf(r.value)) {
			const item = p.items.find((i) => i.value === pill.text);
			if (!item) continue;
			pill.el.setAttribute(COLOR, item.color);
			if (item.solid) pill.el.setAttribute(FILL, 'solid');
		}
		return;
	}
	if (p.kind === 'chip') {
		if (p.color) r.value?.setAttribute(COLOR, p.color);
		if (p.solid) r.value?.setAttribute(FILL, 'solid');
		return;
	}
	r.row.setAttribute(STATE, p.css);
	r.row.setAttribute('aria-label', p.message);
}

export function clearDecorations(container: HTMLElement): void {
	for (const r of rowsOf(container)) reset(r);
}
