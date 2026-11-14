import { describe, it, expect } from 'vitest';
import { inAnyFolder, inFolder } from '../src/editor/pickers/folderMatch';

describe('inFolder', () => {
	it('matches a folder named by one word at any depth, and a path from the root', () => {
		expect(inFolder('projects/api/decisions/DEC-a.md', 'decisions')).toBe(true);
		expect(inFolder('projects/api/tasks/T-a.md', 'decisions')).toBe(false);
		expect(inFolder('projects/api/a.md', 'projects')).toBe(true);
		expect(inFolder('archive/a.md', 'projects')).toBe(false);
		expect(inFolder('anything.md', undefined)).toBe(true);
	});
});

describe('inAnyFolder', () => {
	it('matches a note under any of the folders', () => {
		const folders = ['decisions', 'output'];
		expect(inAnyFolder('projects/api/decisions/DEC-a.md', folders)).toBe(true);
		expect(inAnyFolder('projects/api/output/OUT-a.md', folders)).toBe(true);
		expect(inAnyFolder('projects/api/tasks/T-a.md', folders)).toBe(false);
	});

	it('matches every note when no folder is given', () => {
		expect(inAnyFolder('a/b.md', [])).toBe(true);
	});
});
