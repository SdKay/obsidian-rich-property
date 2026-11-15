import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSchema } from '../../src/schema/compile';
import { DEFAULT_SCHEMA } from '../../src/schema/presets/default';
import { blankSchema } from '../../src/schema/blank';
import { loadSettings, activeSlot } from '../../src/settings';
import { resolveSchema } from '../../src/schema/load';
import { fieldsOf, valuesOf } from '../../src/schema/apiView';

const describeText = (s: string | undefined): string => (s ?? '').replace(/^i18n:/, 'T:');
const noFolders = (): undefined => undefined;
const builtIn = compileSchema(DEFAULT_SCHEMA);
const values = (c: typeof builtIn, key: string, type?: string) => valuesOf(c, key, type, describeText, noFolders)?.map((v) => v.value);

describe('fieldsOf', () => {
	it('lists every built-in property with the value type the contract names', () => {
		const byKey = Object.fromEntries(fieldsOf(builtIn, describeText).map((f) => [f.key, f.valueType]));
		expect(byKey).toMatchObject({
			type: 'text', status: 'text', project: 'text', range: 'text', supersedes: 'text',
			platform: 'list', related: 'list', tags: 'list', 'dir-accepts': 'list',
			schema: 'number', 'dir-review': 'boolean',
			deadline: 'date', reviewed: 'date',
			created: 'datetime', updated: 'datetime',
		});
	});

	it('leaves out the properties other plugins own', () => {
		const keys = fieldsOf(builtIn, describeText).map((f) => f.key);
		for (const reserved of DEFAULT_SCHEMA.reserved) expect(keys).not.toContain(reserved);
	});

	it('carries the types a property is limited to, and none for a general one', () => {
		const fields = Object.fromEntries(fieldsOf(builtIn, describeText).map((f) => [f.key, f]));
		expect(fields.priority?.types).toEqual(['task']);
		expect(fields.deadline?.types).toEqual(['brief', 'task']);
		expect(fields.author).not.toHaveProperty('types');
	});

	it('passes the description through the translator', () => {
		const fields = Object.fromEntries(fieldsOf(builtIn, describeText).map((f) => [f.key, f]));
		expect(fields.status?.description).toBe('T:desc.status');
	});
});

describe('valuesOf', () => {
	it('gives the values of one type, and the union over all types without one', () => {
		expect(values(builtIn, 'status', 'task')).toEqual(['todo', 'doing', 'blocked', 'done']);
		const all = values(builtIn, 'status') ?? [];
		for (const v of ['planned', 'todo', 'stable', 'proposed', 'final']) expect(all).toContain(v);
		expect(new Set(all).size).toBe(all.length);
	});

	it('treats a type the rules do not know as no type, not as an error', () => {
		expect(values(builtIn, 'status', 'nonsense')).toEqual(values(builtIn, 'status'));
	});

	it('carries the color, solid flag and description of a value', () => {
		const review = valuesOf(builtIn, 'review', undefined, describeText, noFolders);
		expect(review?.find((v) => v.value === 'changed')).toMatchObject({ color: 'red', description: 'T:val.review.changed' });
	});

	it('gives the two values of a bool and expands tag groups to prefix/value', () => {
		expect(values(builtIn, 'dir-review')).toEqual(['true', 'false']);
		expect(values(builtIn, 'tags')).toContain('sw/zephyr');
		expect(values(builtIn, 'tags')).toContain('wifi');
	});

	it('has no fixed list for text, dates, numbers and links', () => {
		for (const key of ['customer', 'deadline', 'schema', 'related', 'supersedes', 'created']) {
			expect(valuesOf(builtIn, key, undefined, describeText, noFolders), key).toBeUndefined();
		}
	});

	it('takes the values of a folder source from the plugin, and none when it cannot read them', () => {
		const read = (key: string) => (key === 'project' ? [{ value: 'app' }, { value: 'app/web' }] : undefined);
		expect(valuesOf(builtIn, 'project', undefined, describeText, read)?.map((v) => v.value)).toEqual(['app', 'app/web']);
		expect(valuesOf(builtIn, 'project', undefined, describeText, noFolders)).toBeUndefined();
	});

	it('knows nothing of an unknown or reserved property', () => {
		expect(valuesOf(builtIn, 'nothing', undefined, describeText, noFolders)).toBeUndefined();
		expect(valuesOf(builtIn, 'cssclasses', undefined, describeText, noFolders)).toBeUndefined();
	});
});

describe('the rules the user is actually using', () => {
	const saved = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`test/fixtures/saved/${name}`, 'utf8')) as Record<string, unknown>;
	const active = (raw: unknown) => {
		const s = loadSettings(raw as never);
		return resolveSchema(activeSlot(s), s.blank).compiled;
	};

	it('a start from nothing shows only what the user added, and none of the built-in properties', () => {
		const c = active(saved('v0.1.0-blank-start.json'));
		expect(fieldsOf(c, describeText).map((f) => f.key)).toEqual(['type', 'status', 'estimate', 'owner', 'due', 'labels']);
		expect(values(c, 'type')).toEqual(['ticket', 'note']);
		expect(values(c, 'status')).toEqual(['open', 'closed']);
		expect(fieldsOf(c, describeText).find((f) => f.key === 'estimate')).toMatchObject({ valueType: 'number', types: ['ticket'] });
	});

	it('edited built-in rules show the user\'s own properties and values', () => {
		const c = active(saved('v0.1.0-edited-built-in.json'));
		expect(fieldsOf(c, describeText).map((f) => f.key)).toEqual(['type', 'status', 'project', 'note-to-self']);
		expect(values(c, 'type')).toEqual(['task', 'my-own-type']);
		expect(values(c, 'status')).toEqual(['todo', 'my-own-state']);
	});

	it('an empty start has only the type property, with a list that is empty and not missing', () => {
		const c = compileSchema(blankSchema());
		expect(fieldsOf(c, describeText).map((f) => f.key)).toEqual(['type']);
		expect(values(c, 'type')).toEqual([]);
	});
});
