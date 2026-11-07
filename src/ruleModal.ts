import { Modal, type App } from 'obsidian';
import { chipPicker } from './chipPicker';
import { t } from './i18n';
import { conditionValues, effectValues, makeCondition, makeEffect, opOf, type ConditionOp, type EffectKind } from './schema/edit';
import type { Option, Rule, Schema } from './schema/types';

interface CondRow {
	field: string;
	op: ConditionOp;
	values: string[];
}
interface EffRow {
	field: string;
	kind: EffectKind;
	values: Option[];
}

const OPS: ConditionOp[] = ['in', 'notIn', 'exists', 'notExists'];
const OP_LABEL = { in: 'opIn', notIn: 'opNotIn', exists: 'opExists', notExists: 'opNotExists' } as const;
const EFFECTS: EffectKind[] = ['available', 'unavailable', 'values'];
const EFFECT_LABEL = { available: 'effAvailable', unavailable: 'effUnavailable', values: 'effValues' } as const;

function select(parent: HTMLElement, choices: [string, string][], value: string, onChange: (v: string) => void): void {
	const el = parent.createEl('select', { cls: 'dropdown rp-rule-select' });
	for (const [v, label] of choices) el.createEl('option', { value: v, text: label });
	el.value = value;
	el.addEventListener('change', () => onChange(el.value));
}

/**
 * Edits one rule as two blocks on a shared grid: "When" with an all/any choice over condition rows,
 * and "Then" with result rows. Every row starts at the same left edge and the controls line up in columns.
 */
export class RuleModal extends Modal {
	private match: Rule['match'];
	private conds: CondRow[];
	private effs: EffRow[];
	private readonly fieldKeys: string[];
	private bodyEl: HTMLElement | null = null;
	private errorEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly rule: Rule,
		private readonly schema: Schema,
		private readonly onSave: (rule: Rule) => string | null,
	) {
		super(app);
		this.fieldKeys = Object.keys(schema.fields);
		this.match = rule.match;
		this.conds = rule.when.map((c) => ({ field: c.field, op: opOf(c), values: conditionValues(c) }));
		this.effs = rule.then.map((e) => ({ field: e.field, kind: e.effect, values: effectValues(e) }));
	}

	onOpen(): void {
		this.setTitle(t('rulesSection'));
		this.modalEl.addClass('rp-rule-modal');
		this.bodyEl = this.contentEl.createDiv({ cls: 'rp-rule' });
		this.errorEl = this.contentEl.createDiv({ cls: 'rp-schema-errors rp-hidden' });
		const footer = this.contentEl.createDiv({ cls: 'rp-rule-footer' });
		footer.createEl('button', { cls: 'mod-cta', text: t('save') }).addEventListener('click', () => this.submit());
		footer.createEl('button', { text: t('cancel') }).addEventListener('click', () => this.close());
		this.render();
	}

	/** The values a field can take, or undefined when it has no fixed list (dates, text, links). */
	private valuesOf(field: string): string[] | undefined {
		const def = this.schema.fields[field];
		if (def?.kind === 'bool') return ['true', 'false'];
		if (def?.source?.kind === 'static') return def.source.values.map((o) => o.value);
		return undefined;
	}

	private optionsOf(field: string): Option[] | undefined {
		const src = this.schema.fields[field]?.source;
		return src?.kind === 'static' ? src.values : undefined;
	}

	private fieldChoices(): [string, string][] {
		return [['', '—'], ...this.fieldKeys.map((k): [string, string] => [k, k])];
	}

	private render(): void {
		const el = this.bodyEl;
		if (!el) return;
		el.empty();
		this.renderWhen(el.createDiv({ cls: 'rp-rule-block' }));
		this.renderThen(el.createDiv({ cls: 'rp-rule-block' }));
	}

	private renderWhen(block: HTMLElement): void {
		const head = block.createDiv({ cls: 'rp-rule-head' });
		head.createSpan({ cls: 'rp-rule-label', text: t('ruleWhen') });
		select(head, [['all', t('matchAll')], ['any', t('matchAny')]], this.match, (v) => (this.match = v as Rule['match']));

		this.conds.forEach((row, i) => {
			const line = block.createDiv({ cls: 'rp-rule-row' });
			select(line, this.fieldChoices(), row.field, (v) => {
				row.field = v;
				row.values = [];
				this.render();
			});
			const fixed = this.valuesOf(row.field) !== undefined;
			if (!fixed && (row.op === 'in' || row.op === 'notIn')) row.op = 'exists';
			select(line, OPS.filter((op) => fixed || op === 'exists' || op === 'notExists').map((op): [string, string] => [op, t(OP_LABEL[op])]), row.op, (v) => {
				row.op = v as ConditionOp;
				this.render();
			});
			const choices = this.valuesOf(row.field);
			const valuesCell = line.createDiv({ cls: 'rp-rule-values' });
			if ((row.op === 'in' || row.op === 'notIn') && choices) {
				chipPicker(valuesCell, choices, row.values, (next) => (row.values = next));
			}
			this.removeButton(line, () => {
				this.conds.splice(i, 1);
				this.render();
			});
		});
		if (this.conds.length === 0) block.createDiv({ cls: 'rp-rule-note', text: t('ruleNoConditions') });
		this.addButton(block, t('addCondition'), () => {
			this.conds.push({ field: this.fieldKeys[0] ?? '', op: 'in', values: [] });
			this.render();
		});
	}

	private renderThen(block: HTMLElement): void {
		block.createDiv({ cls: 'rp-rule-head' }).createSpan({ cls: 'rp-rule-label', text: t('ruleThen') });

		this.effs.forEach((row, i) => {
			const line = block.createDiv({ cls: 'rp-rule-row' });
			select(line, this.fieldChoices(), row.field, (v) => {
				row.field = v;
				row.values = [];
				this.render();
			});
			const hasList = this.optionsOf(row.field) !== undefined;
			if (row.kind === 'values' && !hasList) row.kind = 'available';
			select(line, EFFECTS.filter((k) => k !== 'values' || hasList).map((k): [string, string] => [k, t(EFFECT_LABEL[k])]), row.kind, (v) => {
				row.kind = v as EffectKind;
				this.render();
			});
			const own = this.optionsOf(row.field);
			const valuesCell = line.createDiv({ cls: 'rp-rule-values' });
			if (row.kind === 'values' && own) {
				chipPicker(valuesCell, own.map((o) => o.value), row.values.map((o) => o.value), (next) => {
					row.values = next.flatMap((v) => structuredClone(own.find((o) => o.value === v) ?? []));
				});
			}
			this.removeButton(line, () => {
				this.effs.splice(i, 1);
				this.render();
			});
		});
		this.addButton(block, t('addEffect'), () => {
			this.effs.push({ field: this.fieldKeys[0] ?? '', kind: 'available', values: [] });
			this.render();
		});
	}

	private removeButton(parent: HTMLElement, onClick: () => void): void {
		const b = parent.createEl('button', { cls: 'rp-rule-remove clickable-icon', text: '×', attr: { type: 'button', 'aria-label': t('remove') } });
		b.addEventListener('click', onClick);
	}

	private addButton(parent: HTMLElement, label: string, onClick: () => void): void {
		const b = parent.createEl('button', { cls: 'rp-rule-add', text: `+ ${label}`, attr: { type: 'button' } });
		b.addEventListener('click', onClick);
	}

	private submit(): void {
		const rule: Rule = {
			id: this.rule.id,
			match: this.match,
			when: this.conds.filter((r) => r.field).map((r) => makeCondition(r.field, r.op, r.values)),
			then: this.effs.filter((r) => r.field).map((r) => makeEffect(r.field, r.kind, r.values)),
		};
		const error = rule.then.length === 0 ? t('ruleEmpty') : this.onSave(rule);
		if (error === null) {
			this.close();
			return;
		}
		this.errorEl?.removeClass('rp-hidden');
		this.errorEl?.setText(error);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
