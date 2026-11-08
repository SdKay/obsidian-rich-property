import { fmt, t } from '../i18n';
import type { NoteReport } from '../schema/types';
import { contentOf } from './domContract';

const HOST = 'data-rp-placeholders';

export interface PlaceholderModel {
	typePrompt: boolean;
	keys: string[];
}

export function placeholderModel(report: NoteReport): PlaceholderModel {
	return { typePrompt: !report.type.valid, keys: report.type.valid ? report.missing : [] };
}

export function clearPlaceholders(container: HTMLElement): void {
	container.querySelector(`[${HOST}]`)?.remove();
}

/**
 * Our own block under the native list: we never insert fake rows into Obsidian's list, which would
 * fight its own row management. Rebuilt only when the model changes (compared by stamp).
 */
export function renderPlaceholders(container: HTMLElement, model: PlaceholderModel, owner: string, onPick: (key: string | null) => void): void {
	const content = contentOf(container);
	if (!content) return;
	// The owner is in the stamp: a view that switches notes must rebuild, or the old buttons would write to the old note.
	const stamp = `${owner}|${model.typePrompt}|${model.keys.join(',')}`;
	const existing = container.querySelector<HTMLElement>(`[${HOST}]`);
	if (existing?.getAttribute('data-rp-stamp') === stamp) return;
	existing?.remove();
	if (!model.typePrompt && model.keys.length === 0) return;

	const host = content.createDiv({ cls: 'rp-placeholders' });
	host.setAttribute(HOST, '');
	host.setAttribute('data-rp-stamp', stamp);
	if (model.typePrompt) {
		host.createEl('button', { cls: 'rp-placeholder', text: t('chooseType'), attr: { 'aria-label': t('chooseTypeAria'), 'data-rp-pick': '' } });
	}
	for (const key of model.keys) {
		host.createEl('button', { cls: 'rp-placeholder', text: `+ ${key}`, attr: { 'aria-label': fmt('setField', { key }), 'data-rp-pick': key } });
	}
	// One delegated handler on our own element; it is removed together with the element.
	host.onclick = (evt) => {
		const btn = (evt.target as Element | null)?.closest?.('[data-rp-pick]');
		if (!btn) return;
		const key = btn.getAttribute('data-rp-pick');
		onPick(key === '' ? null : key);
	};
}
