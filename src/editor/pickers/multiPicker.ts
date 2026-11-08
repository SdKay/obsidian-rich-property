import { Menu, Notice } from 'obsidian';
import { fmt } from '../../i18n';
import { menuTitle } from '../../menuTitle';
import { optionGroups } from './sources';
import type { EditContext } from './registry';

function currentList(v: unknown): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
	return typeof v === 'string' && v !== '' ? [v] : [];
}

/** Toggles one value in a list. Values already in the note but outside the vocabulary are kept, never dropped. */
export function toggled(list: string[], value: string): string[] {
	return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * A menu that stays usable for several picks: each click writes, then the menu reopens with fresh
 * check marks from the updated note, so no custom popup is needed.
 */
export function multiEditor(ctx: EditContext): (() => void) | undefined {
	const groups = optionGroups(ctx.app, ctx.compiled, ctx.key, ctx.props);
	if (!groups) return undefined;
	const open = (list: string[]): void => {
		const menu = new Menu();
		groups.forEach((group, i) => {
			if (i > 0) menu.addSeparator();
			if (group.label) menu.addItem((item) => item.setTitle(group.label ?? '').setIsLabel(true));
			for (const option of group.options) {
				menu.addItem((item) =>
					item
						.setTitle(menuTitle(option.value, option.description))
						.setChecked(list.includes(option.value))
						.onClick(() => {
							const next = toggled(list, option.value);
							ctx.write(ctx.key, next).then(() => open(next), () => new Notice(fmt('updateFailed', { key: ctx.key })));
						}),
				);
			}
		});
		const rect = ctx.anchor.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom }, ctx.anchor.ownerDocument);
	};
	return () => open(currentList(ctx.props[ctx.key]));
}
