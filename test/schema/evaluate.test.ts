import { describe, it, expect } from 'vitest';
import { compileSchema } from '../../src/schema/compile';
import { availabilityOf, currentType, isEmpty, missingFields, resolveOptions } from '../../src/schema/evaluate';
import type { Rule, Schema } from '../../src/schema/types';

const opts = (...values: string[]) => values.map((value) => ({ value }));

function build(rules: Rule[] = []): ReturnType<typeof compileSchema> {
	const schema: Schema = {
		schemaVersion: 2,
		typeField: 'type',
		reserved: [],
		rules,
		fields: {
			type: { kind: 'enum', source: { kind: 'static', values: opts('task', 'solution', 'note') } },
			author: { kind: 'enum', source: { kind: 'static', values: opts('human', 'agent', 'mixed') } },
			review: { kind: 'enum', source: { kind: 'static', values: opts('none', 'reviewed') } },
			status: { kind: 'enum', source: { kind: 'static', values: opts('todo', 'done', 'draft') }, types: ['task', 'solution'] },
			due: { kind: 'date', types: ['task'] },
			legacy: { kind: 'text', types: ['task'], placeholder: false },
			memo: { kind: 'text', placeholder: true },
		},
	};
	return compileSchema(schema);
}

const reviewRule: Rule = {
	id: 'r1', match: 'all', when: [{ field: 'author', in: ['agent', 'mixed'] }], then: [{ field: 'review', effect: 'available' }],
};
const statusTask: Rule = {
	id: 's1', match: 'all', when: [{ field: 'type', in: ['task'] }], then: [{ field: 'status', effect: 'values', values: opts('todo', 'done') }],
};
const statusSolution: Rule = {
	id: 's2', match: 'all', when: [{ field: 'type', in: ['solution'] }], then: [{ field: 'status', effect: 'values', values: opts('draft') }],
};

describe('currentType', () => {
	const c = build();
	it('returns a known type', () => expect(currentType(c, { type: 'task' })).toBe('task'));
	it('returns undefined for missing, unknown or non-string types', () => {
		expect(currentType(c, {})).toBeUndefined();
		expect(currentType(c, { type: 'weekly' })).toBeUndefined();
		expect(currentType(c, { type: 3 })).toBeUndefined();
	});
});

describe('type limits', () => {
	const c = build();
	it('flags a field outside its types', () => {
		expect(availabilityOf(c, 'due', { type: 'solution' })).toEqual({ available: false, reason: 'type', type: 'solution', allowedTypes: ['task'] });
	});
	it('never rules a field out when the type is missing or unknown', () => {
		expect(availabilityOf(c, 'due', {}).available).toBe(true);
		expect(availabilityOf(c, 'due', { type: 'weekly' }).available).toBe(true);
	});
});

describe('rules: available', () => {
	const c = build([reviewRule]);
	it('a field with an available rule is usable only while that rule applies', () => {
		expect(availabilityOf(c, 'review', { author: 'agent' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'mixed' }).available).toBe(true);
		const a = availabilityOf(c, 'review', { author: 'human' });
		expect(a.available).toBe(false);
		if (!a.available && a.reason === 'rule') expect(a.rule.id).toBe('r1');
		expect(availabilityOf(c, 'review', {}).available).toBe(false);
	});
	it('a field no rule mentions is unaffected', () => {
		expect(availabilityOf(c, 'author', {}).available).toBe(true);
	});
	it('with several available rules, any one applying is enough', () => {
		const other: Rule = { id: 'r2', match: 'all', when: [{ field: 'type', in: ['note'] }], then: [{ field: 'review', effect: 'available' }] };
		const both = build([reviewRule, other]);
		expect(availabilityOf(both, 'review', { type: 'note' }).available).toBe(true);
		expect(availabilityOf(both, 'review', { author: 'agent' }).available).toBe(true);
		expect(availabilityOf(both, 'review', { type: 'task', author: 'human' }).available).toBe(false);
	});
});

describe('rules: unavailable', () => {
	it('any applying unavailable rule removes the field', () => {
		const c = build([{ id: 'u', match: 'all', when: [{ field: 'author', in: ['human'] }], then: [{ field: 'review', effect: 'unavailable' }] }]);
		expect(availabilityOf(c, 'review', { author: 'human' }).available).toBe(false);
		expect(availabilityOf(c, 'review', { author: 'agent' }).available).toBe(true);
	});
	it('wins over an applying available rule', () => {
		const c = build([
			reviewRule,
			{ id: 'u', match: 'all', when: [{ field: 'type', in: ['note'] }], then: [{ field: 'review', effect: 'unavailable' }] },
		]);
		expect(availabilityOf(c, 'review', { author: 'agent', type: 'note' }).available).toBe(false);
		expect(availabilityOf(c, 'review', { author: 'agent', type: 'task' }).available).toBe(true);
	});
});

describe('rules: match all or any', () => {
	const rule = (match: 'all' | 'any'): Rule => ({
		id: 'm', match,
		when: [{ field: 'author', in: ['agent'] }, { field: 'type', in: ['task'] }],
		then: [{ field: 'review', effect: 'available' }],
	});
	it('all needs every condition', () => {
		const c = build([rule('all')]);
		expect(availabilityOf(c, 'review', { author: 'agent', type: 'task' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'agent', type: 'note' }).available).toBe(false);
	});
	it('any needs one condition', () => {
		const c = build([rule('any')]);
		expect(availabilityOf(c, 'review', { author: 'agent', type: 'note' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'human', type: 'task' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'human', type: 'note' }).available).toBe(false);
	});
	it('a rule without conditions always applies', () => {
		const c = build([{ id: 'always', match: 'all', when: [], then: [{ field: 'review', effect: 'unavailable' }] }]);
		expect(availabilityOf(c, 'review', {}).available).toBe(false);
	});
});

describe('conditions', () => {
	const gate = (when: Rule['when']): ReturnType<typeof compileSchema> =>
		build([{ id: 'c', match: 'all', when, then: [{ field: 'review', effect: 'available' }] }]);
	const ok = (c: ReturnType<typeof compileSchema>, props: Record<string, unknown>) => availabilityOf(c, 'review', props).available;

	it('notIn: true when the value is not listed or missing, false when listed', () => {
		const c = gate([{ field: 'author', notIn: ['human'] }]);
		expect(ok(c, { author: 'agent' })).toBe(true);
		expect(ok(c, {})).toBe(true);
		expect(ok(c, { author: 'human' })).toBe(false);
	});
	it('exists true and false, for missing, empty and filled values', () => {
		const set = gate([{ field: 'author', exists: true }]);
		const unset = gate([{ field: 'author', exists: false }]);
		for (const v of [undefined, null, '', []]) {
			expect(ok(set, { author: v }), `set ${JSON.stringify(v)}`).toBe(false);
			expect(ok(unset, { author: v }), `unset ${JSON.stringify(v)}`).toBe(true);
		}
		for (const v of ['x', ['x']]) {
			expect(ok(set, { author: v }), `set ${JSON.stringify(v)}`).toBe(true);
			expect(ok(unset, { author: v }), `unset ${JSON.stringify(v)}`).toBe(false);
		}
	});
	it('a list value matches when any element matches; an empty list never matches in', () => {
		const c = gate([{ field: 'author', in: ['x'] }]);
		expect(ok(c, { author: ['q', 'x'] })).toBe(true);
		expect(ok(c, { author: ['q', 'y'] })).toBe(false);
		expect(ok(c, { author: [] })).toBe(false);
		expect(ok(gate([{ field: 'author', notIn: ['x'] }]), { author: ['q', 'x'] })).toBe(false);
	});
});

describe('resolveOptions', () => {
	it('uses the field list when no rule applies', () => {
		expect(resolveOptions(build(), 'author', {})?.map((o) => o.value)).toEqual(['human', 'agent', 'mixed']);
	});
	it('a values rule replaces the list while it applies', () => {
		const c = build([statusTask, statusSolution]);
		expect(resolveOptions(c, 'status', { type: 'task' })?.map((o) => o.value)).toEqual(['todo', 'done']);
		expect(resolveOptions(c, 'status', { type: 'solution' })?.map((o) => o.value)).toEqual(['draft']);
	});
	it('offers nothing to judge by for a type-limited field until the note has a valid type', () => {
		const c = build([statusTask, statusSolution]);
		expect(resolveOptions(c, 'status', {})).toBeUndefined();
		expect(resolveOptions(c, 'status', { type: 'weekly' })).toBeUndefined();
	});
	it('several applying values rules keep only the values all of them allow', () => {
		const second: Rule = { id: 's3', match: 'all', when: [{ field: 'author', in: ['agent'] }], then: [{ field: 'status', effect: 'values', values: opts('done', 'draft') }] };
		const c = build([statusTask, second]);
		expect(resolveOptions(c, 'status', { type: 'task', author: 'agent' })?.map((o) => o.value)).toEqual(['done']);
		expect(resolveOptions(c, 'status', { type: 'task', author: 'human' })?.map((o) => o.value)).toEqual(['todo', 'done']);
	});
	it('is undefined for a field with no static list', () => {
		expect(resolveOptions(build(), 'due', {})).toBeUndefined();
	});
});

describe('missingFields', () => {
	it('lists type-limited fields that are absent, in schema order', () => {
		const c = build();
		expect(missingFields(c, { type: 'task' })).toEqual(['status', 'due', 'memo']);
		expect(missingFields(c, { type: 'solution' })).toEqual(['status', 'memo']);
	});
	it('skips fields already present, even when empty', () => {
		expect(missingFields(build(), { type: 'task', due: null })).toEqual(['status', 'memo']);
	});
	it('lists nothing when the type is unknown, even for a field that has no type limit', () => {
		const c = build();
		for (const props of [{}, { type: 'weekly' }]) {
			expect(missingFields(c, props)).toEqual([]);
		}
		expect(missingFields(c, { type: 'note' })).toContain('memo');
	});
	it('honours placeholder: false', () => {
		expect(missingFields(build(), { type: 'task' })).not.toContain('legacy');
	});
	it('does not list a field whose rules make it unavailable', () => {
		const gated = build([{ id: 'g', match: 'all', when: [{ field: 'author', in: ['agent'] }], then: [{ field: 'memo', effect: 'available' }] }]);
		expect(missingFields(gated, { type: 'note', author: 'agent' })).toContain('memo');
		expect(missingFields(gated, { type: 'note', author: 'human' })).not.toContain('memo');
	});
});

describe('isEmpty', () => {
	it('treats null, undefined, empty string and empty array as empty', () => {
		for (const v of [null, undefined, '', []]) expect(isEmpty(v)).toBe(true);
		for (const v of [0, false, 'x', ['x']]) expect(isEmpty(v)).toBe(false);
	});
});
