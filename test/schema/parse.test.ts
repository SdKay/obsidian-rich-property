import { describe, it, expect } from 'vitest';
import { parseSchema } from '../../src/schema/parse';

const minimal = () => ({
	schemaVersion: 1,
	typeField: 'type',
	reserved: ['cssclasses'],
	fields: {
		type: { kind: 'enum', source: { kind: 'static', values: [{ value: 'task' }, { value: 'note' }] } },
		status: {
			kind: 'enum',
			source: { kind: 'static', byType: { task: [{ value: 'todo' }, { value: 'done' }] } },
		},
		due: { kind: 'date', availability: { types: ['task'] } },
		reviewed: { kind: 'date', availability: { when: [{ field: 'type', in: ['task'] }] } },
	},
});

describe('parseSchema', () => {
	it('accepts a well-formed schema', () => {
		const r = parseSchema(minimal());
		expect(r.ok).toBe(true);
	});

	it('rejects non-objects and wrong versions', () => {
		expect(parseSchema(null).ok).toBe(false);
		expect(parseSchema([]).ok).toBe(false);
		const r = parseSchema({ ...minimal(), schemaVersion: 2 });
		expect(r.ok).toBe(false);
	});

	it('requires the type field to be a static enum', () => {
		const s = minimal();
		s.fields.type = { kind: 'text' } as never;
		const r = parseSchema(s);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.join('\n')).toContain('must exist as an enum with a static "values" list');
	});

	it('rejects unknown kinds, duplicate values and unknown colors', () => {
		const s = minimal();
		(s.fields as Record<string, unknown>).bad = { kind: 'nope' };
		(s.fields as Record<string, unknown>).dup = {
			kind: 'enum',
			source: { kind: 'static', values: [{ value: 'a' }, { value: 'a', color: 'magenta' }] },
		};
		const r = parseSchema(s);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			const msg = r.errors.join('\n');
			expect(msg).toContain('bad');
			expect(msg).toContain('duplicate');
			expect(msg).toContain('magenta');
		}
	});

	it('rejects byType and availability.types that name a type which does not exist', () => {
		const s = minimal();
		s.fields.due.availability = { types: ['ghost'] };
		s.fields.status.source = { kind: 'static', byType: { ghost: [{ value: 'x' }] } } as never;
		const r = parseSchema(s);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.filter((e) => e.includes('ghost')).length).toBe(2);
	});

	it('rejects conditions that reference a missing field', () => {
		const s = minimal();
		s.fields.reviewed.availability = { when: [{ field: 'nothing', in: ['x'] }] };
		const r = parseSchema(s);
		expect(r.ok).toBe(false);
	});

	describe('tag-vocab source', () => {
		const withAxes = (axes: unknown) => {
			const s = minimal();
			(s.fields as Record<string, unknown>).tags = { kind: 'tags', source: { kind: 'tag-vocab', axes } };
			return s;
		};

		it('accepts well-formed axes', () => {
			const r = parseSchema(withAxes([
				{ label: 'Area', prefix: 'area', values: ['work', 'home'] },
				{ label: 'Pri', prefix: 'p', values: [], allowBare: true },
			]));
			expect(r.ok).toBe(true);
		});

		it('reports one error per malformed axis', () => {
			const r = parseSchema(withAxes([1, null]));
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.errors.filter((e) => e.includes('axes[')).length).toBe(2);
		});

		it('rejects an empty axes array', () => {
			const r = parseSchema(withAxes([]));
			expect(r.ok).toBe(false);
		});

		it('rejects an entry in values that is not a value', () => {
			const r = parseSchema(withAxes([{ label: 'Area', prefix: 'area', values: [{ value: 'work' }, 3] }]));
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.errors.join('\n')).toContain('axes[0].values[1]: needs a non-empty string "value"');
		});

		it('upgrades a folder source saved with one path to a list, so a saved project folder is kept', () => {
			const s = minimal();
			(s.fields as Record<string, unknown>).project = { kind: 'enum', source: { kind: 'vault-dir', path: 'Work/active' } };
			const r = parseSchema(s);
			expect(r.ok).toBe(true);
			expect(r.ok ? r.schema.fields.project?.source : undefined).toEqual({ kind: 'vault-dir', paths: ['Work/active'] });
		});

		it('keeps requireFile and a depth of 1 to 3 on a folder source', () => {
			const s = minimal();
			const source = { kind: 'vault-dir', paths: ['Work'], requireFile: 'brief.md', depth: 2 };
			(s.fields as Record<string, unknown>).project = { kind: 'enum', source };
			const r = parseSchema(s);
			expect(r.ok ? r.schema.fields.project?.source : undefined).toEqual(source);
		});

		it.each([0, 4, 1.5, '2'])('rejects a folder depth of %s', (depth) => {
			const s = minimal();
			(s.fields as Record<string, unknown>).project = { kind: 'enum', source: { kind: 'vault-dir', paths: ['Work'], depth } };
			const r = parseSchema(s);
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.errors.join('\n')).toContain('"depth" must be a whole number from 1 to 3');
		});

		it('keeps a note search saved with one folder, and accepts a list of folders', () => {
			for (const source of [{ kind: 'note-search', folder: 'decisions' }, { kind: 'note-search', folders: ['decisions', 'output'] }]) {
				const s = minimal();
				(s.fields as Record<string, unknown>).link = { kind: 'link', source };
				const r = parseSchema(s);
				expect(r.ok ? r.schema.fields.link?.source : undefined).toEqual(source);
			}
		});

		it.each([[[]], [['']], ['decisions'], [[1]]])('rejects folders of %j', (folders) => {
			const s = minimal();
			(s.fields as Record<string, unknown>).link = { kind: 'link', source: { kind: 'note-search', folders } };
			const r = parseSchema(s);
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.errors.join('\n')).toContain('"folders" must be a non-empty list of folder names');
		});

		it('upgrades values saved as plain strings to options, so earlier saved rules keep working', () => {
			const r = parseSchema(withAxes([{ label: 'Area', prefix: 'area', values: ['work', 'home'] }]));
			expect(r.ok).toBe(true);
			const src = r.ok ? r.schema.fields.tags?.source : undefined;
			expect(src?.kind === 'tag-vocab' ? src.axes[0]?.values : undefined).toEqual([{ value: 'work' }, { value: 'home' }]);
		});

		it('rejects a non-boolean allowBare', () => {
			const r = parseSchema(withAxes([{ label: 'Area', prefix: 'area', values: ['work'], allowBare: 'yes' }]));
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.errors.join('\n')).toContain('axes[0]: "allowBare" must be a boolean');
		});
	});

	it('reports every problem, not only the first', () => {
		const r = parseSchema({ schemaVersion: 2, typeField: '', fields: {}, reserved: 'x' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(3);
	});
});
