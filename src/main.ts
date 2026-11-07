import { Plugin } from 'obsidian';
import { resolveSchema, type ActiveSchema } from './schema/load';
import { activeSlot, loadSettings, type RichPropertySettings } from './settings';
import { RichPropertySettingTab } from './settingTab';

// Keep this file to the plugin lifecycle: load settings, register commands, views and events.
// Everything else lives in its own module, pure ones first.
export default class RichPropertyPlugin extends Plugin {
	settings: RichPropertySettings = loadSettings(null);
	active: ActiveSchema = resolveSchema(null);

	async onload(): Promise<void> {
		this.settings = loadSettings((await this.loadData()) as Partial<RichPropertySettings> | null);
		this.active = resolveSchema(activeSlot(this.settings), this.settings.blank);
		this.addSettingTab(new RichPropertySettingTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async applySettings(): Promise<void> {
		await this.saveSettings();
		this.active = resolveSchema(activeSlot(this.settings), this.settings.blank);
	}
}
