import { Notice, SuggestModal, prepareFuzzySearch, type App, type TFile } from 'obsidian';
import { fmt, t } from '../../i18n';
import { inAnyFolder } from './folderMatch';
import type { EditContext } from './registry';

/** The text written to a note: the vault path without the extension, so it matches the vault's link convention. */
export function linkFor(file: TFile): string {
	return `[[${file.path.replace(/\.md$/, '')}]]`;
}

export function candidateNotes(app: App, folders: string[], self: TFile | null): TFile[] {
	return app.vault.getMarkdownFiles().filter((f) => inAnyFolder(f.path, folders) && f !== self);
}

class NoteModal extends SuggestModal<TFile> {
	constructor(app: App, private readonly files: TFile[], private readonly onPick: (file: TFile) => void) {
		super(app);
		this.setPlaceholder(t('searchNotes'));
	}

	getSuggestions(query: string): TFile[] {
		if (!query) return this.files.slice(0, 50);
		const match = prepareFuzzySearch(query);
		return this.files
			.map((file) => ({ file, result: match(file.path) }))
			.filter((x) => x.result !== null)
			.sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0))
			.slice(0, 50)
			.map((x) => x.file);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ text: file.basename });
		el.createDiv({ cls: 'rp-menu-desc', text: file.parent?.path ?? '' });
	}

	onChooseSuggestion(file: TFile): void {
		this.onPick(file);
	}
}

function currentLinks(value: unknown): string[] {
	if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
	return typeof value === 'string' && value !== '' ? [value] : [];
}

/**
 * Opens a note search and writes the chosen note as a link. A single link is replaced; a list gets
 * the new link added unless it is already there, and existing entries are never touched.
 */
export function noteEditor(ctx: EditContext): (() => void) | undefined {
	const source = ctx.def.source;
	const folders = source?.kind === 'note-search' ? [...(source.folder ? [source.folder] : []), ...(source.folders ?? [])] : [];
	const files = candidateNotes(ctx.app, folders, ctx.app.workspace.getActiveFile());
	if (files.length === 0) return undefined;
	return () => {
		new NoteModal(ctx.app, files, (file) => {
			const link = linkFor(file);
			const existing = currentLinks(ctx.props[ctx.key]);
			const next = ctx.def.kind === 'link-list' ? (existing.includes(link) ? existing : [...existing, link]) : link;
			ctx.write(ctx.key, next).catch(() => new Notice(fmt('updateFailed', { key: ctx.key })));
		}).open();
	};
}
