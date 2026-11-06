import { Plugin } from 'obsidian';
import { loadSettings, type RichPropertySettings } from './settings';

// Keep this file to the plugin lifecycle: load settings, register commands, views and events.
// Everything else lives in its own module, pure ones first.
export default class RichPropertyPlugin extends Plugin {
	settings: RichPropertySettings = loadSettings(null);

	async onload(): Promise<void> {
		this.settings = loadSettings((await this.loadData()) as Partial<RichPropertySettings> | null);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
