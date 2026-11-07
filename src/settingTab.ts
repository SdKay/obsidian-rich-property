import { Modal, Notice, PluginSettingTab, Setting, type App, type SettingDefinitionItem } from 'obsidian';
import { FieldModal } from './fieldModal';
import { describeText, fmt, t } from './i18n';
import { RuleModal } from './ruleModal';
import { addType, applyForm, editableCopy, formFor, newRule, putRule, removeField, removeRule } from './schema/edit';
import { activeSlot, setActiveSlot } from './settings';
import { parseSchema } from './schema/parse';
import type { Rule, Schema } from './schema/types';
import type RichPropertyPlugin from './main';

function typeValuesOf(schema: Schema): string[] {
	const src = schema.fields[schema.typeField]?.source;
	return src?.kind === 'static' ? src.values.map((o) => o.value) : [];
}

export class RichPropertySettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: RichPropertyPlugin) {
		super(app, plugin);
	}

	// Declarative settings need Obsidian 1.13+, above our minAppVersion, so the tab keeps display().
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [];
	}

	display(): void {
		this.rerender();
	}

	private build(): void {
		const { containerEl } = this;

		new Setting(containerEl)
			.setName(t('settingStyling'))
			.setDesc(t('settingStylingDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.styling).onChange(async (v) => {
					this.plugin.settings.styling = v;
					await this.plugin.applySettings();
				}),
			);

		new Setting(containerEl)
			.setName(t('settingBlank'))
			.setDesc(t('settingBlankDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.blank).onChange(async (v) => {
					this.plugin.settings.blank = v;
					await this.plugin.applySettings();
					this.rerender();
				}),
			);

		const { errors, usingStart } = this.plugin.active;
		if (errors.length > 0) {
			const box = containerEl.createDiv({ cls: 'rp-schema-errors' });
			box.createEl('p', { text: t('schemaDamaged') });
			const ul = box.createEl('ul');
			for (const e of errors) ul.createEl('li', { text: e });
		} else if (usingStart) {
			containerEl.createEl('p', { cls: 'setting-item-description', text: t(this.plugin.settings.blank ? 'usingBlank' : 'usingBuiltIn') });
		}

		this.renderRules(containerEl);
	}

	private rerender(): void {
		this.containerEl.empty();
		this.build();
	}

	private async commit(schema: Schema): Promise<string | null> {
		const parsed = parseSchema(schema);
		if (!parsed.ok) return parsed.errors.join('\n');
		setActiveSlot(this.plugin.settings, schema);
		await this.plugin.applySettings();
		this.rerender();
		return null;
	}

	private renderRules(el: HTMLElement): void {
		const schema = editableCopy(activeSlot(this.plugin.settings), this.plugin.settings.blank);

		new Setting(el).setName(t('propsHeading')).setDesc(t('propsDesc')).setHeading();
		new Setting(el)
			.setName(fmt('fieldCount', { n: Object.keys(schema.fields).length }))
			.addButton((b) => b.setButtonText(t('addField')).setCta().onClick(() => this.editField(schema, null)))
			.addButton((b) => b.setButtonText(t('addType')).onClick(() => this.askTypeName(schema)));
		for (const [key, def] of Object.entries(schema.fields)) {
			const scope = fmt('appliesTo', { scope: def.types?.join(', ') ?? t('allTypes') });
			new Setting(el)
				.setName(key)
				.setDesc(`${describeText(def.description) ? `${describeText(def.description)} · ` : ''}${scope}`)
				.addExtraButton((b) => b.setIcon('pencil').setTooltip(t('edit')).onClick(() => this.editField(schema, key)))
				.addExtraButton((b) =>
					b.setIcon('trash').setTooltip(t('remove')).onClick(() => {
						if (key !== schema.typeField) void this.commit(removeField(schema, key));
					}),
				);
		}

		new Setting(el).setName(t('rulesSection')).setDesc(t('rulesSectionDesc')).setHeading();
		new Setting(el).addButton((b) => b.setButtonText(t('addRule')).setCta().onClick(() => this.editRule(schema, newRule(schema))));
		if (schema.rules.length === 0) el.createEl('p', { cls: 'setting-item-description', text: t('noRules') });
		for (const rule of schema.rules) {
			new Setting(el)
				.setName(this.ruleTitle(rule))
				.setDesc(this.ruleSummary(rule))
				.addExtraButton((b) => b.setIcon('pencil').setTooltip(t('edit')).onClick(() => this.editRule(schema, rule)))
				.addExtraButton((b) => b.setIcon('trash').setTooltip(t('remove')).onClick(() => void this.commit(removeRule(schema, rule.id))));
		}

		new Setting(el)
			.addButton((b) => b.setButtonText(t('exportRules')).onClick(() => void this.exportRules(schema)))
			.addButton((b) => b.setButtonText(t('importRules')).onClick(() => this.importRules()))
			.addButton((b) =>
				b.setButtonText(t(this.plugin.settings.blank ? 'resetBlank' : 'resetRules')).onClick(() => {
					setActiveSlot(this.plugin.settings, null);
					void this.plugin.applySettings().then(() => {
						new Notice(t('rulesReset'));
						this.rerender();
					});
				}),
			);
	}

	private ruleTitle(rule: Rule): string {
		return rule.then.map((e) => e.field).join(', ');
	}

	private ruleSummary(rule: Rule): string {
		const joiner = t(rule.match === 'all' ? 'and' : 'or');
		const when = rule.when.map((c) => {
			if ('exists' in c) return `${c.field} ${t(c.exists ? 'opExists' : 'opNotExists')}`;
			return `${c.field} ${t('in' in c ? 'opIn' : 'opNotIn')} ${('in' in c ? c.in : c.notIn).join('/')}`;
		});
		return `${t('ruleWhen')}: ${when.length > 0 ? when.join(joiner) : t('ruleNoConditions')}`;
	}

	private editRule(schema: Schema, rule: Rule): void {
		new RuleModal(this.app, structuredClone(rule), schema, (r) => {
			const next = putRule(schema, r);
			const parsed = parseSchema(next);
			if (!parsed.ok) return parsed.errors.join('\n');
			void this.commit(next).then(() => new Notice(t('rulesSaved')));
			return null;
		}).open();
	}

	private editField(schema: Schema, key: string | null): void {
		const form = formFor(schema, key ?? '');
		// The box shows the built-in text in the UI language; if it is left alone the key is kept, so it keeps following the language.
		const storedDescription = form.description;
		const shownDescription = describeText(storedDescription);
		form.description = shownDescription;
		new FieldModal(
			this.app,
			form,
			(f) => {
				if (!f.key) return t('nameRequired');
				if (f.key !== key && f.key in schema.fields) return t('nameTaken');
				const next = applyForm(schema, { ...f, description: f.description === shownDescription ? storedDescription : f.description }, key ?? undefined);
				const parsed = parseSchema(next);
				if (!parsed.ok) return parsed.errors.join('\n');
				void this.commit(next).then(() => new Notice(t('rulesSaved')));
				return null;
			},
			typeValuesOf(schema),
		).open();
	}

	private askTypeName(schema: Schema): void {
		const modal = new Modal(this.app);
		let name = '';
		modal.setTitle(t('addType'));
		new Setting(modal.contentEl).setName(t('typeName')).addText((c) => c.onChange((v) => (name = v.trim())));
		new Setting(modal.contentEl).addButton((b) =>
			b.setButtonText(t('save')).setCta().onClick(() => {
				if (!name) return;
				modal.close();
				void this.commit(addType(schema, name));
			}),
		);
		modal.open();
	}

	private async exportRules(schema: Schema): Promise<void> {
		await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
		new Notice(t('rulesExported'));
	}

	private importRules(): void {
		const modal = new Modal(this.app);
		let text = '';
		modal.setTitle(t('importRules'));
		new Setting(modal.contentEl).setName(t('importPrompt')).addTextArea((c) => {
			c.onChange((v) => (text = v));
			c.inputEl.rows = 12;
		});
		const errorEl = modal.contentEl.createDiv({ cls: 'rp-schema-errors rp-hidden' });
		new Setting(modal.contentEl).addButton((b) =>
			b.setButtonText(t('importRules')).setCta().onClick(() => {
				let parsed: unknown;
				try {
					parsed = JSON.parse(text);
				} catch {
					errorEl.removeClass('rp-hidden');
					errorEl.setText(t('importFailed'));
					return;
				}
				const result = parseSchema(parsed);
				if (!result.ok) {
					errorEl.removeClass('rp-hidden');
					errorEl.setText(result.errors.join('\n'));
					return;
				}
				modal.close();
				void this.commit(result.schema).then(() => new Notice(t('rulesSaved')));
			}),
		);
		modal.open();
	}
}
