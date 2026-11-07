import { describe, it, expect } from 'vitest';
import { folderPaths, type FolderNode } from '../../src/schema/folderTree';

const dir = (name: string, files: string[] = [], folders: FolderNode[] = []): FolderNode => ({ name, files, folders });

const projects = dir('2-projects', ['000-RULES.md'], [
	dir('WHC-self', ['brief.md'], [dir('GSPI-v12', ['brief.md'], [dir('deep', ['brief.md'])]), dir('notes', ['a.md'])]),
	dir('SFI', ['brief.md']),
	dir('cmake', ['note.md']),
	dir('group', [], [dir('child', ['brief.md'])]),
]);

describe('folderPaths', () => {
	it('lists one level by default of the caller, as plain names', () => {
		expect(folderPaths(projects, 1)).toEqual(['WHC-self', 'SFI', 'cmake', 'group']);
	});

	it('lists a parent and the folders one level under it as paths from the root', () => {
		expect(folderPaths(projects, 2, 'brief.md')).toEqual(['WHC-self', 'WHC-self/GSPI-v12', 'SFI', 'group/child']);
	});

	it('leaves out folders without the required file but still looks inside them', () => {
		const paths = folderPaths(projects, 2, 'brief.md');
		expect(paths).not.toContain('cmake');
		expect(paths).not.toContain('group');
		expect(paths).not.toContain('WHC-self/notes');
		expect(paths).toContain('group/child');
	});

	it('does not go deeper than the depth', () => {
		expect(folderPaths(projects, 2, 'brief.md')).not.toContain('WHC-self/GSPI-v12/deep');
		expect(folderPaths(projects, 3, 'brief.md')).toContain('WHC-self/GSPI-v12/deep');
	});

	it('lists nothing for an empty folder', () => {
		expect(folderPaths(dir('empty'), 2, 'brief.md')).toEqual([]);
	});
});
