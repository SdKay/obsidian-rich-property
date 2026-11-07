import { Menu } from 'obsidian';
import { fmt, t } from './i18n';

export interface ChipPickerOptions {
	/** Pick at most one value; choosing it again clears it. */
	single?: boolean;
}

/**
 * Shows only the chosen values, as removable chips, plus one button that opens a menu of the
 * available values (checked when chosen). The full list is never laid out, so it takes no room.
 */
export function chipPicker(
	parent: HTMLElement,
	options: string[],
	selected: string[],
	onChange: (next: string[]) => void,
	opts: ChipPickerOptions = {},
): void {
	let current = [...selected];
	let addButton: HTMLElement | null = null;
	const box = parent.createDiv({ cls: 'rp-chips' });

	// Chosen values that are no longer offered stay visible so they can be removed.
	const order = (list: string[]): string[] => [...options.filter((o) => list.includes(o)), ...list.filter((o) => !options.includes(o))];

	const change = (next: string[]): void => {
		current = order(next);
		onChange(current);
		render();
	};

	const toggle = (value: string): string[] => {
		if (opts.single) return current.includes(value) ? [] : [value];
		return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
	};

	const openMenu = (): void => {
		const anchor = addButton;
		if (!anchor) return;
		const menu = new Menu();
		for (const value of options) {
			menu.addItem((item) =>
				item.setTitle(value).setChecked(current.includes(value)).onClick(() => {
					change(toggle(value));
					if (!opts.single) openMenu();
				}),
			);
		}
		const rect = anchor.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom }, anchor.ownerDocument);
	};

	function render(): void {
		box.empty();
		for (const value of current) {
			const chip = box.createDiv({ cls: 'rp-chip' });
			chip.createSpan({ text: value });
			const remove = chip.createEl('button', {
				cls: 'rp-chip-remove',
				text: '×',
				attr: { type: 'button', 'aria-label': fmt('removeValue', { value }) },
			});
			remove.addEventListener('click', () => change(current.filter((v) => v !== value)));
		}
		if (options.length === 0) return;
		addButton = box.createEl('button', {
			cls: 'rp-chip-add',
			text: current.length > 0 ? '+' : t('chooseValues'),
			attr: { type: 'button', 'aria-label': t('chooseValues'), 'aria-haspopup': 'menu' },
		});
		addButton.addEventListener('click', openMenu);
	}

	render();
}
