import { TFile, TFolder, normalizePath, type App } from 'obsidian';
import type { CompiledSchema } from '../../schema/compile';
import { resolveOptions, type Props } from '../../schema/evaluate';
import { folderPaths, type FolderNode } from '../../schema/folderTree';
import type { Option, TagAxis } from '../../schema/types';

export interface OptionGroup {
	label: string | null;
	options: Option[];
}

/** Option groups for a field, or undefined when the source cannot offer any (so the native editor stays). */
export function optionGroups(app: App, c: CompiledSchema, key: string, props: Props): OptionGroup[] | undefined {
	const source = c.fields.get(key)?.source;
	if (!source) return undefined;
	if (source.kind === 'vault-dir') {
		const names = source.paths.flatMap((path) => {
			const folder = app.vault.getAbstractFileByPath(normalizePath(path));
			if (!(folder instanceof TFolder)) return [];
			return folderPaths(toNode(folder), source.depth ?? 1, source.requireFile?.trim() || undefined);
		});
		// The same name under two folders is one choice.
		const options = [...new Set(names)].map((value) => ({ value }));
		return options.length > 0 ? [{ label: null, options }] : undefined;
	}
	if (source.kind === 'tag-vocab') return source.axes.map(axisGroup);
	const options = resolveOptions(c, key, props);
	return options && options.length > 0 ? [{ label: null, options }] : undefined;
}

function toNode(folder: TFolder): FolderNode {
	return {
		name: folder.name,
		folders: folder.children.filter((f): f is TFolder => f instanceof TFolder).map(toNode),
		files: folder.children.filter((f): f is TFile => f instanceof TFile).map((f) => f.name),
	};
}

function axisGroup(axis: TagAxis): OptionGroup {
	const options: Option[] = axis.values.map((o) => ({ ...o, value: `${axis.prefix}/${o.value}` }));
	if (axis.allowBare) options.unshift({ ...axis.bare, value: axis.prefix });
	return { label: axis.label, options };
}
