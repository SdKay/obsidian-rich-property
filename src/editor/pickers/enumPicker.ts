import { Menu, Notice } from 'obsidian';
import { fmt } from '../../i18n';
import { menuTitle } from '../../menuTitle';
import { resolveOptions } from '../../schema/evaluate';
import { optionGroups } from './sources';
import type { ColorToken, FieldDef, Option } from '../../schema/types';
import type { EditContext } from './registry';

export interface MenuChoice {
	value: string | boolean;
	label: string;
	color?: ColorToken;
	description?: string;
	checked: boolean;
}

/** Pure: what the menu offers. Undefined means there is nothing legal to offer, so the caller leaves the native editor alone. */
export function buildChoices(def: FieldDef, options: Option[] | undefined, current: unknown): MenuChoice[] | undefined {
	if (def.kind === 'bool') {
		return [true, false].map((value) => ({ value, label: String(value), checked: current === value }));
	}
	if (!options || options.length === 0) return undefined;
	return options.map((o) => ({ value: o.value, label: o.value, color: o.color, description: o.description, checked: o.value === current }));
}

/** Returns undefined when there is nothing legal to offer (for example status with no valid type, or project whose source is not wired yet). */
export function enumEditor(ctx: EditContext): (() => void) | undefined {
	const source = ctx.def.source?.kind;
	const options = source === 'vault-dir'
		? optionGroups(ctx.app, ctx.compiled, ctx.key, ctx.props)?.[0]?.options
		: resolveOptions(ctx.compiled, ctx.key, ctx.props);
	const choices = buildChoices(ctx.def, options, ctx.props[ctx.key]);
	if (!choices) return undefined;
	return () => {
		const menu = new Menu();
		for (const choice of choices) {
			menu.addItem((item) =>
				item
					.setTitle(menuTitle(choice.label, choice.description))
					.setChecked(choice.checked)
					.onClick(() => {
						ctx.write(ctx.key, choice.value).catch(() => new Notice(fmt('updateFailed', { key: ctx.key })));
					}),
			);
		}
		const rect = ctx.anchor.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom }, ctx.anchor.ownerDocument);
	};
}
