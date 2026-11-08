import { MarkdownView, type Plugin, type TFile } from 'obsidian';
import type { ActiveSchema } from '../schema/load';
import { styledOptions, type Props } from '../schema/evaluate';
import { validateNote } from '../schema/validate';
import { clearDecorations, decorateRow } from './decorate';
import { findContainers, rowsOf } from './domContract';
import { presentField } from './present';
import { clearPlaceholders, placeholderModel, renderPlaceholders } from './placeholders';
import { editorFor } from './pickers/registry';
import { createWriter } from './writer';

export interface ControllerHost extends Plugin {
	active: ActiveSchema;
	settings: { styling: boolean };
}

const ON = 'rp-on';

export class EditorController {
	private observers = new Map<HTMLElement, MutationObserver>();
	private frame: number | undefined;
	private failed = false;

	constructor(private readonly host: ControllerHost) {}

	start(): void {
		const { workspace, metadataCache } = this.host.app;
		this.host.registerEvent(workspace.on('file-open', () => this.refresh()));
		this.host.registerEvent(workspace.on('active-leaf-change', () => this.refresh()));
		this.host.registerEvent(workspace.on('layout-change', () => this.refresh()));
		this.host.registerEvent(metadataCache.on('changed', () => this.refresh()));
		this.host.register(() => this.stop());
		workspace.onLayoutReady(() => this.refresh());
	}

	/** Coalesces any number of triggers in one tick into a single redraw. */
	refresh(): void {
		if (this.frame !== undefined) return;
		// setTimeout rather than requestAnimationFrame: rAF pauses while the main window is hidden, which would stall popout windows.
		this.frame = window.setTimeout(() => {
			this.frame = undefined;
			this.redraw();
		}, 0);
	}

	stop(): void {
		if (this.frame !== undefined) window.clearTimeout(this.frame);
		this.frame = undefined;
		for (const [container, observer] of this.observers) {
			observer.disconnect();
			clearDecorations(container);
			clearPlaceholders(container);
			container.classList.remove(ON);
		}
		this.observers.clear();
	}

	private redraw(): void {
		try {
			const live = new Set<HTMLElement>();
			this.host.app.workspace.iterateAllLeaves((leaf) => {
				if (!(leaf.view instanceof MarkdownView) || !leaf.view.file) return;
				for (const container of findContainers(leaf.view.containerEl)) {
					live.add(container);
					this.draw(container, leaf.view.file);
					this.watch(container);
				}
			});
			for (const [container, observer] of this.observers) {
				if (live.has(container)) continue;
				observer.disconnect();
				this.observers.delete(container);
			}
		} catch (err) {
			if (!this.failed) console.error('[rich-property] redraw failed, skipping:', err);
			this.failed = true;
		}
	}

	private draw(container: HTMLElement, file: TFile): void {
		if (!this.host.settings.styling) {
			clearDecorations(container);
			clearPlaceholders(container);
			container.classList.remove(ON);
			return;
		}
		const props: Props = this.host.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const compiled = this.host.active.compiled;
		const report = validateNote(compiled, props);
		container.classList.add(ON);
		for (const row of rowsOf(container)) {
			const rep = report.fields[row.key] ?? { state: 'reserved' as const };
			decorateRow(row, presentField(rep, row.key, props[row.key], styledOptions(compiled, row.key, props)));
		}
		renderPlaceholders(container, placeholderModel(report), file.path, (key) => this.pick(container, file, key));
	}

	private pick(container: HTMLElement, file: TFile, key: string | null): void {
		const compiled = this.host.active.compiled;
		const fieldKey = key ?? compiled.typeField;
		const def = compiled.fields.get(fieldKey);
		const editor = def ? editorFor(def.kind) : undefined;
		const anchor = container.querySelector<HTMLElement>('[data-rp-placeholders]');
		if (!def || !editor || !anchor) return;
		const props = this.host.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		editor({ app: this.host.app, key: fieldKey, def, props, compiled, anchor, ...createWriter(this.host.app, file) })?.();
	}

	private watch(container: HTMLElement): void {
		if (this.observers.has(container)) return;
		const observer = new MutationObserver(() => this.refresh());
		observer.observe(container, { childList: true, subtree: true });
		this.observers.set(container, observer);
	}
}
