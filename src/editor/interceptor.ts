import { MarkdownView, type Plugin, type TFile } from 'obsidian';
import type { ActiveSchema } from '../schema/load';
import { rowFromTarget, type Zone } from './domContract';
import { editorFor, isEditable } from './pickers/registry';
import { createWriter } from './writer';

export interface InterceptHost extends Plugin {
	active: ActiveSchema;
	settings: { styling: boolean };
}

export type Decision = 'open' | 'block' | 'ignore';

/** Pure decision, kept separate so it can be tested without a DOM. */
export function decideIntercept(evt: { type: string; key?: string }, zone: Zone | null, editable: boolean): Decision {
	if (!zone || !editable) return 'ignore';
	if (zone === 'value' && evt.type === 'mousedown') return 'block';
	if (zone === 'value' && evt.type === 'click') return 'open';
	if (zone === 'row-self' && evt.type === 'keydown' && (evt.key === 'Enter' || evt.key === ' ')) return 'open';
	return 'ignore';
}

function fileFor(host: InterceptHost, el: HTMLElement): TFile | null {
	let found: TFile | null = null;
	host.app.workspace.iterateAllLeaves((leaf) => {
		if (leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(el)) found = leaf.view.file;
	});
	return found;
}

/**
 * Capture-phase delegation on a window's document: one listener set whatever the number of rows.
 * Native editing is blocked ONLY when an editor has something legal to offer; otherwise the event
 * passes through untouched, so a field we cannot help with (no file, no valid type, a source not
 * wired yet) stays editable the native way. Measured: Tab only ever focuses the row, and Enter on it
 * moves focus into the native input, so Enter and Space on the row itself are taken too.
 */
export function attachInterceptor(host: InterceptHost, doc: Document): void {
	const handler = (evt: Event): void => {
		if (!host.settings.styling) return;
		const hit = rowFromTarget(evt.target);
		const def = hit ? host.active.compiled.fields.get(hit.key) : undefined;
		const key = evt.type === 'keydown' ? (evt as KeyboardEvent).key : undefined;
		const decision = decideIntercept({ type: evt.type, key }, hit?.zone ?? null, def !== undefined && isEditable(def.kind));
		if (decision === 'ignore' || !hit || !def) return;

		const file = fileFor(host, hit.row);
		const editor = editorFor(def.kind);
		if (!file || !editor) return;
		const props = host.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const open = editor({ app: host.app, key: hit.key, def, props, compiled: host.active.compiled, anchor: hit.value ?? hit.row, ...createWriter(host.app, file) });
		if (!open) return;

		evt.preventDefault();
		evt.stopPropagation();
		if (decision === 'open') open();
	};
	for (const type of ['mousedown', 'click', 'keydown'] as const) host.registerDomEvent(doc, type, handler, { capture: true });
}
