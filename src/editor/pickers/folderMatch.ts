/**
 * Whether a note path is under `folder`, or any path when no folder is set. A folder with one name
 * (`decisions`) matches that folder at any depth, such as `projects/app/decisions`; a folder
 * with a path (`projects`) is a prefix from the vault root.
 */
export function inFolder(path: string, folder: string | undefined): boolean {
	if (!folder) return true;
	const clean = folder.replace(/^\/+|\/+$/g, '');
	if (clean.includes('/')) return path.startsWith(`${clean}/`);
	return path.split('/').slice(0, -1).includes(clean);
}

/** Whether a note path is under any of the folders; with none given, any path. */
export function inAnyFolder(path: string, folders: string[]): boolean {
	return folders.length === 0 || folders.some((f) => inFolder(path, f));
}
