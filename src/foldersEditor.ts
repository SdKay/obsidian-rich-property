import { AbstractInputSuggest, normalizePath, type App, type TFolder } from 'obsidian';
import { t } from './i18n';

/** Suggests the folders that exist in the vault as the user types a path. */
class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, private readonly input: HTMLInputElement, private readonly onPick: (path: string) => void) {
		super(app, input);
	}

	getSuggestions(query: string): TFolder[] {
		const q = query.toLowerCase();
		return this.app.vault
			.getAllFolders(false)
			.filter((f) => f.path.toLowerCase().includes(q))
			.slice(0, 30);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.input.value = folder.path;
		this.onPick(folder.path);
		this.close();
	}
}

/**
 * A list of vault folders, one per line, each typed with folder suggestions. A path that is not a folder
 * in the vault is marked but kept, so a folder that is created later, or lives on another device, still works.
 */
export function foldersEditor(parent: HTMLElement, app: App, initial: string[], onChange: (next: string[]) => void): void {
	let paths = [...initial];
	const box = parent.createDiv({ cls: 'rp-folders' });
	const commit = (): void => onChange(paths.map((p) => p.trim()).filter(Boolean));

	function render(): void {
		box.empty();
		paths.forEach((path, index) => {
			const row = box.createDiv({ cls: 'rp-folder' });
			const input = row.createEl('input', { type: 'text', cls: 'rp-folder-input', attr: { placeholder: t('folderPath') } });
			input.value = path;
			const mark = (): void => input.toggleClass('is-missing', input.value.trim() !== '' && !app.vault.getAbstractFileByPath(normalizePath(input.value.trim())));
			mark();
			const save = (value: string): void => {
				paths[index] = value;
				mark();
				commit();
			};
			input.addEventListener('input', () => save(input.value));
			new FolderSuggest(app, input, save);
			const remove = row.createEl('button', { cls: 'rp-opt-remove', text: '×', attr: { type: 'button', 'aria-label': t('removeFolder') } });
			remove.addEventListener('click', () => {
				paths.splice(index, 1);
				commit();
				render();
			});
		});
		const add = box.createEl('button', { cls: 'rp-opt-add', text: `+ ${t('addFolder')}`, attr: { type: 'button' } });
		add.addEventListener('click', () => {
			paths = [...paths, ''];
			render();
			box.querySelectorAll<HTMLInputElement>('.rp-folder-input').item(paths.length - 1)?.focus();
		});
	}

	render();
}
