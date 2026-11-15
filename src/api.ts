import type { Plugin } from 'obsidian';
import { optionGroups } from './editor/pickers/sources';
import { describeText } from './i18n';
import type { RichPropertyApi } from './richPropertyApi';
import { fieldsOf, valuesOf } from './schema/apiView';
import type { ActiveSchema } from './schema/load';

export interface ApiHandle {
	api: RichPropertyApi;
	/** Tells every listener the rules changed. A listener that throws does not stop the others. */
	notify(): void;
}

/** Every call reads the rules in use at that moment, so a change in the settings shows at once. */
export function createApi(plugin: Plugin & { active: ActiveSchema }): ApiHandle {
	const listeners = new Set<() => void>();
	const folderValues = (key: string) => {
		const { compiled } = plugin.active;
		return optionGroups(plugin.app, compiled, key, {})?.[0]?.options;
	};
	const api: RichPropertyApi = Object.freeze({
		apiVersion: 1 as const,
		fields: () => fieldsOf(plugin.active.compiled, describeText),
		valuesOf: (key: string, type?: string) => valuesOf(plugin.active.compiled, key, type, describeText, folderValues),
		onChange: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	});
	return {
		api,
		notify: () => {
			for (const listener of [...listeners]) {
				try {
					listener();
				} catch (err) {
					console.error('Rich Property: a change listener failed', err);
				}
			}
		},
	};
}
