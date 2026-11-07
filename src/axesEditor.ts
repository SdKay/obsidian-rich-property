import { t } from './i18n';
import { optionsEditor } from './optionsEditor';
import type { TagAxis } from './schema/types';

/**
 * Edits the axes of a tag vocabulary. Each axis is a collapsible block holding its label, its prefix,
 * whether the bare prefix is allowed on its own, and its values in the same editor used everywhere else.
 */
export function axesEditor(parent: HTMLElement, initial: TagAxis[], onChange: (next: TagAxis[]) => void): void {
	let axes = structuredClone(initial);
	const open = new Set<number>();
	const box = parent.createDiv({ cls: 'rp-axes' });

	const commit = (): void => onChange(structuredClone(axes));

	function render(): void {
		box.empty();
		axes.forEach((axis, index) => {
			const block = box.createDiv({ cls: 'rp-axis' });
			const head = block.createDiv({ cls: 'rp-axis-head' });
			const expanded = open.has(index);
			const toggle = head.createEl('button', {
				cls: 'rp-axis-toggle',
				text: `${expanded ? '▾' : '▸'} ${axis.label || axis.prefix}`,
				attr: { type: 'button', 'aria-expanded': String(expanded) },
			});
			toggle.addEventListener('click', () => {
				if (expanded) open.delete(index);
				else open.add(index);
				render();
			});
			head.createSpan({ cls: 'rp-axis-prefix', text: axis.prefix });
			const remove = head.createEl('button', { cls: 'rp-opt-remove', text: '×', attr: { type: 'button', 'aria-label': t('removeAxis') } });
			remove.addEventListener('click', () => {
				axes.splice(index, 1);
				open.clear();
				commit();
				render();
			});
			if (!expanded) return;

			const body = block.createDiv({ cls: 'rp-axis-body' });
			const names = body.createDiv({ cls: 'rp-axis-names' });
			labeled(names, t('axisLabel'), axis.label, (v) => {
				axis.label = v;
				commit();
			});
			labeled(names, t('axisPrefix'), axis.prefix, (v) => {
				axis.prefix = v;
				commit();
			});
			const bare = body.createEl('label', { cls: 'rp-axis-bare' });
			const check = bare.createEl('input', { type: 'checkbox' });
			check.checked = axis.allowBare === true;
			bare.createSpan({ text: ` ${t('axisBare')}` });
			check.addEventListener('change', () => {
				if (check.checked) axis.allowBare = true;
				else delete axis.allowBare;
				commit();
			});
			optionsEditor(body, axis.values, (next) => {
				axis.values = next.filter((o) => o.value !== '');
				commit();
			});
		});

		const add = box.createEl('button', { cls: 'rp-opt-add', text: `+ ${t('addAxis')}`, attr: { type: 'button' } });
		add.addEventListener('click', () => {
			axes = [...axes, { label: t('newAxis'), prefix: `axis${axes.length + 1}`, values: [] }];
			open.add(axes.length - 1);
			commit();
			render();
		});
	}

	function labeled(parentEl: HTMLElement, label: string, value: string, save: (v: string) => void): void {
		const wrap = parentEl.createEl('label', { cls: 'rp-axis-field' });
		wrap.createSpan({ text: label });
		const input = wrap.createEl('input', { type: 'text' });
		input.value = value;
		input.addEventListener('change', () => save(input.value.trim()));
	}

	render();
}
