import { describe, it, expect } from 'vitest';
import { folderPaths, type FolderNode } from '../../src/schema/folderTree';

const dir = (name: string, files: string[] = [], folders: FolderNode[] = []): FolderNode => ({ name, files, folders });

const projects = dir('projects', ['README.md'], [
	dir('app', ['brief.md'], [dir('web', ['brief.md'], [dir('deep', ['brief.md'])]), dir('notes', ['a.md'])]),
	dir('api', ['brief.md']),
	dir('docs', ['note.md']),
	dir('group', [], [dir('child', ['brief.md'])]),
]);

describe('folderPaths', () => {
	it('lists one level by default of the caller, as plain names', () => {
		expect(folderPaths(projects, 1)).toEqual(['app', 'api', 'docs', 'group']);
	});

	it('lists a parent and the folders one level under it as paths from the root', () => {
		expect(folderPaths(projects, 2, 'brief.md')).toEqual(['app', 'app/web', 'api', 'group/child']);
	});

	it('leaves out folders without the required file but still looks inside them', () => {
		const paths = folderPaths(projects, 2, 'brief.md');
		expect(paths).not.toContain('docs');
		expect(paths).not.toContain('group');
		expect(paths).not.toContain('app/notes');
		expect(paths).toContain('group/child');
	});

	it('does not go deeper than the depth', () => {
		expect(folderPaths(projects, 2, 'brief.md')).not.toContain('app/web/deep');
		expect(folderPaths(projects, 3, 'brief.md')).toContain('app/web/deep');
	});

	it('lists nothing for an empty folder', () => {
		expect(folderPaths(dir('empty'), 2, 'brief.md')).toEqual([]);
	});
});
