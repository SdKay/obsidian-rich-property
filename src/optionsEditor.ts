import { Menu } from 'obsidian';
import { describeText, t } from './i18n';
import { COLOR_TOKENS, type ColorToken, type Option } from './schema/types';

const COLOR_LABEL: Record<ColorToken, Parameters<typeof t>[0]> = {
	red: 'colorRed', orange: 'colorOrange', yellow: 'colorYellow', green: 'colorGreen', cyan: 'colorCyan',
	blue: 'colorBlue', purple: 'colorPurple', pink: 'colorPink', neutral: 'colorGray',
};

/**
 * A compact list of values, one line each: a color dot, the name, a short description and a remove
 * button. Click the dot to pick a color or a solid fill, click a text to edit it in place, drag a line
 * to reorder. Edits go through `onChange` with a fresh array; the caller decides when to save.
 */
export function optionsEditor(parent: HTMLElement, initial: Option[], onChange: (next: Option[]) => void): void {
	let options = structuredClone(initial);
	const box = parent.createDiv({ cls: 'rp-opts' });
	let dragFrom = -1;

	const commit = (): void => onChange(structuredClone(options));

	const pickColor = (index: number, anchor: HTMLElement): void => {
		const current = options[index];
		if (!current) return;
		const menu = new Menu();
		menu.addItem((item) =>
			item.setTitle(t('colorNone')).setChecked(!current.color).onClick(() => {
				delete current.color;
				delete current.solid;
				commit();
				render();
			}),
		);
		for (const color of COLOR_TOKENS) {
			menu.addItem((item) =>
				item.setTitle(t(COLOR_LABEL[color])).setChecked(current.color === color).onClick(() => {
					current.color = color;
					commit();
					render();
				}),
			);
		}
		if (current.color) {
			menu.addSeparator();
			menu.addItem((item) =>
				item.setTitle(t('colorSolid')).setChecked(current.solid === true).onClick(() => {
					if (current.solid) delete current.solid;
					else current.solid = true;
					commit();
					render();
				}),
			);
		}
		const rect = anchor.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom }, anchor.ownerDocument);
	};

	/** Text that turns into an input on click and writes back on blur or Enter. */
	const editable = (parentEl: HTMLElement, cls: string, value: string, placeholder: string, save: (v: string) => void): void => {
		const text = parentEl.createSpan({ cls: `${cls} rp-opt-text`, text: value || placeholder, attr: { tabindex: '0', role: 'button' } });
		if (!value) text.addClass('is-placeholder');
		const edit = (): void => {
			const input = createEl('input', { cls: `${cls} rp-opt-input`, type: 'text' });
			input.value = value;
			input.placeholder = placeholder;
			text.replaceWith(input);
			input.focus();
			input.select();
			let done = false;
			const finish = (apply: boolean): void => {
				if (done) return;
				done = true;
				if (apply) save(input.value.trim());
				render();
			};
			input.addEventListener('blur', () => finish(true));
			input.addEventListener('keydown', (evt) => {
				if (evt.key === 'Enter') finish(true);
				else if (evt.key === 'Escape') finish(false);
			});
		};
		text.addEventListener('click', edit);
		text.addEventListener('keydown', (evt) => {
			if (evt.key === 'Enter' || evt.key === ' ') {
				evt.preventDefault();
				edit();
			}
		});
	};

	function render(): void {
		box.empty();
		const seen = new Set<string>();
		options.forEach((option, index) => {
			const duplicate = option.value !== '' && seen.has(option.value);
			seen.add(option.value);
			const row = box.createDiv({ cls: 'rp-opt', attr: { draggable: 'true' } });
			if (duplicate || option.value === '') row.addClass('is-invalid');

			row.createSpan({ cls: 'rp-opt-grip', text: '⋮⋮', attr: { 'aria-hidden': 'true' } });

			const dot = row.createEl('button', {
				cls: 'rp-opt-dot',
				attr: { type: 'button', 'aria-label': t('colorPick'), 'aria-haspopup': 'menu', 'data-color': option.color ?? 'none', 'data-solid': option.solid ? 'true' : 'false' },
			});
			dot.addEventListener('click', () => pickColor(index, dot));

			editable(row, 'rp-opt-name', option.value, t('valueName'), (v) => {
				option.value = v;
				commit();
			});
			const shown = describeText(option.description);
			editable(row, 'rp-opt-desc', shown, t('valueDescription'), (v) => {
				// Left as shown, a built-in description keeps its key and so keeps following the UI language.
				if (v === shown) return;
				if (v) option.description = v;
				else delete option.description;
				commit();
			});

			const remove = row.createEl('button', { cls: 'rp-opt-remove', text: '×', attr: { type: 'button', 'aria-label': t('removeValueRow') } });
			remove.addEventListener('click', () => {
				options.splice(index, 1);
				commit();
				render();
			});

			row.addEventListener('dragstart', (evt) => {
				dragFrom = index;
				evt.dataTransfer?.setData('text/plain', String(index));
				row.addClass('is-dragging');
			});
			row.addEventListener('dragend', () => row.removeClass('is-dragging'));
			row.addEventListener('dragover', (evt) => evt.preventDefault());
			row.addEventListener('drop', (evt) => {
				evt.preventDefault();
				if (dragFrom < 0 || dragFrom === index) return;
				const [moved] = options.splice(dragFrom, 1);
				if (moved) options.splice(index, 0, moved);
				dragFrom = -1;
				commit();
				render();
			});
		});

		const add = box.createEl('button', { cls: 'rp-opt-add', text: `+ ${t('addValue')}`, attr: { type: 'button' } });
		add.addEventListener('click', () => {
			options = [...options, { value: '' }];
			render();
			box.querySelectorAll<HTMLElement>('.rp-opt-name').item(options.length - 1)?.click();
		});
	}

	render();
}
