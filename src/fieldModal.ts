import { Modal, Setting, type App } from 'obsidian';
import { chipPicker } from './chipPicker';
import { axesEditor } from './axesEditor';
import { foldersEditor } from './foldersEditor';
import { optionsEditor } from './optionsEditor';
import { t } from './i18n';
import { FIELD_KINDS, type FieldKind } from './schema/types';
import type { FieldForm, ListSource } from './schema/edit';

const KIND_LABEL: Record<FieldKind, Parameters<typeof t>[0]> = {
	enum: 'kindEnum', 'multi-enum': 'kindMulti', bool: 'kindBool', date: 'kindDate', datetime: 'kindDatetime',
	'date-range': 'kindRange', link: 'kindLink', 'link-list': 'kindLinks', int: 'kindInt', text: 'kindText', 'text-list': 'kindTextList', tags: 'kindTags',
};

const LISTED: FieldKind[] = ['enum', 'multi-enum'];

export class FieldModal extends Modal {
	private errorEl: HTMLElement | null = null;

	constructor(
		app: App,
		private readonly form: FieldForm,
		private readonly onSave: (form: FieldForm) => string | null,
		private readonly typeValues: string[],
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl, form } = this;
		this.setTitle(t('fieldName'));
		new Setting(contentEl).setName(t('fieldName')).addText((c) => c.setValue(form.key).onChange((v) => (form.key = v.trim())));
		new Setting(contentEl).setName(t('fieldDescription')).addText((c) => c.setValue(form.description).onChange((v) => (form.description = v)));
		new Setting(contentEl).setName(t('fieldKind')).addDropdown((c) => {
			for (const kind of FIELD_KINDS) c.addOption(kind, t(KIND_LABEL[kind]));
			c.setValue(form.kind).onChange((v) => {
				form.kind = v as FieldKind;
				this.render();
			});
		});
		this.optionsHost = contentEl.createDiv();
		this.render();
		const typesSetting = new Setting(contentEl).setName(t('fieldTypes')).setDesc(t('fieldTypesDesc'));
		chipPicker(typesSetting.controlEl, this.typeValues, form.types, (next) => (form.types = next));
		this.errorEl = contentEl.createDiv({ cls: 'rp-schema-errors rp-hidden' });
		new Setting(contentEl)
			.addButton((b) => b.setButtonText(t('save')).setCta().onClick(() => this.submit()))
			.addButton((b) => b.setButtonText(t('cancel')).onClick(() => this.close()));
	}

	private optionsHost: HTMLElement | null = null;

	private render(): void {
		const host = this.optionsHost;
		if (!host) return;
		host.empty();
		const { form } = this;
		if (form.kind === 'tags' && form.axes.length > 0) {
			new Setting(host).setName(t('fieldOptions')).setDesc(t('axesDesc')).setClass('rp-setting-block');
			axesEditor(host, form.axes, (next) => (form.axes = next));
			return;
		}
		// A source with its own structure (note search) has no editor here and is left as it is.
		if (!LISTED.includes(form.kind) || (form.fixedSource && form.listSource === 'list')) return;
		if (!form.fixedSource) {
			new Setting(host).setName(t('fieldSource')).addDropdown((c) => {
				c.addOption('list', t('sourceList')).addOption('folders', t('sourceFolders'));
				c.setValue(form.listSource).onChange((v) => {
					form.listSource = v as ListSource;
					this.render();
				});
			});
		}
		if (form.listSource === 'folders') {
			new Setting(host).setName(t('fieldOptions')).setDesc(t('foldersDesc')).setClass('rp-setting-block');
			foldersEditor(host, this.app, form.paths, (next) => (form.paths = next));
			return;
		}
		new Setting(host).setName(t('fieldOptions')).setDesc(t('fieldOptionsDesc')).setClass('rp-setting-block');
		optionsEditor(host, form.options, (next) => (form.options = next));
	}

	private submit(): void {
		this.form.options = this.form.options.filter((o) => o.value !== '');
		const error = this.onSave(this.form);
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
