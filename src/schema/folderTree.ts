export interface FolderNode {
	name: string;
	folders: FolderNode[];
	/** Names of the files directly in this folder. */
	files: string[];
}

/**
 * Folder names below `root`, as paths from it, down to `depth` levels. With `requireFile`, a folder is listed only when
 * it holds that file; a folder without it is skipped but its children are still looked at, as a group folder is not a project.
 */
export function folderPaths(root: FolderNode, depth: number, requireFile?: string): string[] {
	const out: string[] = [];
	const walk = (node: FolderNode, prefix: string, level: number): void => {
		for (const child of node.folders) {
			const path = prefix ? `${prefix}/${child.name}` : child.name;
			if (!requireFile || child.files.includes(requireFile)) out.push(path);
			if (level < depth) walk(child, path, level + 1);
		}
	};
	walk(root, '', 1);
	return out;
}
