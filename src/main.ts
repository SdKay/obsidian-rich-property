import { Plugin } from 'obsidian';
import { createApi } from './api';
import type { RichPropertyApi } from './richPropertyApi';
import { EditorController } from './editor/controller';
import { attachInterceptor } from './editor/interceptor';
import { resolveSchema, type ActiveSchema } from './schema/load';
import { activeSlot, loadSettings, type RichPropertySettings } from './settings';
import { RichPropertySettingTab } from './settingTab';

// Keep this file to the plugin lifecycle: load settings, register commands, views and events.
// Everything else lives in its own module, pure ones first.
export default class RichPropertyPlugin extends Plugin {
	settings: RichPropertySettings = loadSettings(null);
	active: ActiveSchema = resolveSchema(null);
	private controller = new EditorController(this);
	private apiHandle = createApi(this);
	/** Read only; see `RichPropertyApi`. Looked up by other plugins on every use. */
	readonly api: RichPropertyApi = this.apiHandle.api;

	async onload(): Promise<void> {
		this.settings = loadSettings((await this.loadData()) as Partial<RichPropertySettings> | null);
		this.active = resolveSchema(activeSlot(this.settings), this.settings.blank);
		this.addSettingTab(new RichPropertySettingTab(this.app, this));
		this.controller.start();
		attachInterceptor(this, this.app.workspace.containerEl.ownerDocument);
		this.registerEvent(this.app.workspace.on('window-open', (_win, win) => attachInterceptor(this, win.document)));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async applySettings(): Promise<void> {
		await this.saveSettings();
		this.active = resolveSchema(activeSlot(this.settings), this.settings.blank);
		this.controller.refresh();
		this.apiHandle.notify();
	}
}
