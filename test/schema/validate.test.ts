import { describe, it, expect } from 'vitest';
import { DEFAULT_SCHEMA } from '../../src/schema/presets/default';
import { parseSchema } from '../../src/schema/parse';
import { compileSchema } from '../../src/schema/compile';
import { validateNote } from '../../src/schema/validate';
import type { Schema } from '../../src/schema/types';

const c = compileSchema(DEFAULT_SCHEMA);
const state = (props: Record<string, unknown>, key: string) => validateNote(c, props).fields[key];

describe('validateNote: acceptance cases', () => {
	it('3: a legacy status value is invalid and lists the legal ones', () => {
		expect(state({ type: 'task', status: 'in-progress' }, 'status')).toEqual({
			state: 'invalid-value',
			allowed: ['todo', 'doing', 'blocked', 'done'],
		});
	});

	it('2: after switching to solution, status is re-judged and task-only fields mismatch but stay listed', () => {
		const r = validateNote(c, { type: 'solution', status: 'todo', priority: 'high', deadline: '2026-01-01' });
		expect(r.fields.status).toEqual({ state: 'invalid-value', allowed: ['draft', 'stable', 'superseded'] });
		expect(r.fields.priority).toEqual({ state: 'type-mismatch', type: 'solution', allowedTypes: ['task'] });
		expect(r.fields.deadline).toEqual({ state: 'type-mismatch', type: 'solution', allowedTypes: ['brief', 'task'] });
	});

	it('4: a rules note offers only dir-* extras; dir-accepts takes type values', () => {
		expect(state({ type: 'rules', 'dir-accepts': ['task', 'devlog'] }, 'dir-accepts')).toEqual({ state: 'ok' });
		expect(state({ type: 'rules', 'dir-accepts': ['task', 'bogus'] }, 'dir-accepts').state).toBe('invalid-value');
		expect(state({ type: 'rules', status: 'todo' }, 'status').state).toBe('type-mismatch');
		const { missing } = validateNote(c, { type: 'rules' });
		expect(missing.length).toBeGreaterThan(0);
		expect(missing.every((k) => k.startsWith('dir-'))).toBe(true);
	});

	it('7: reserved fields are never flagged', () => {
		const r = validateNote(c, { cssclasses: ['a'], banner: 'x.png', 'kanban-plugin': 'basic', aliases: [] });
		expect(Object.values(r.fields).every((f) => f.state === 'reserved')).toBe(true);
	});

	it('8: a user-added field limited to task appears for task only', () => {
		const custom: Schema = structuredClone(DEFAULT_SCHEMA);
		custom.fields.estimate = { kind: 'text', types: ['task'] };
		const parsed = parseSchema(custom);
		if (!parsed.ok) throw new Error(parsed.errors.join('; '));
		const cc = compileSchema(parsed.schema);
		expect(validateNote(cc, { type: 'task' }).missing).toContain('estimate');
		expect(validateNote(cc, { type: 'solution' }).missing).not.toContain('estimate');
		expect(validateNote(cc, { type: 'solution', estimate: '3' }).fields.estimate?.state).toBe('type-mismatch');
	});
});

describe('validateNote: other rules', () => {
	it('flags fields outside the whitelist', () => {
		expect(state({ type: 'task', 'ai-first': true }, 'ai-first')).toEqual({ state: 'unknown-field' });
	});

	it('flags the legacy type weekly and lists the legal types', () => {
		const r = validateNote(c, { type: 'weekly' });
		expect(r.type).toEqual({ value: 'weekly', valid: false });
		const f = r.fields.type;
		expect(f?.state).toBe('invalid-value');
		if (f?.state === 'invalid-value') expect(f.allowed).toContain('period');
	});

	it('does not judge type-specific values without a valid type, and offers no placeholders', () => {
		const r = validateNote(c, { status: 'whatever' });
		expect(r.type).toEqual({ value: undefined, valid: false });
		expect(r.fields.status).toEqual({ state: 'ok' });
		expect(r.missing).toEqual([]);
	});

	it('applies field-to-field conditions (review needs author agent or mixed)', () => {
		expect(state({ type: 'task', author: 'human', review: 'none' }, 'review').state).toBe('condition-unmet');
		expect(state({ type: 'task', author: 'agent', review: 'none' }, 'review')).toEqual({ state: 'ok' });
		expect(state({ author: 'agent', review: 'none', reviewed: '2026-01-01' }, 'reviewed').state).toBe('condition-unmet');
		expect(state({ author: 'agent', review: 'changed', reviewed: '2026-01-01' }, 'reviewed')).toEqual({ state: 'ok' });
	});

	it('checks date, datetime, range, bool and int formats', () => {
		expect(state({ created: '2026-01-01 10:00:00' }, 'created')).toEqual({ state: 'ok' });
		expect(state({ created: '2026-01-01' }, 'created')).toEqual({ state: 'ok' });
		expect(state({ created: 'yesterday' }, 'created')).toEqual({ state: 'invalid-value', allowed: [], format: 'YYYY-MM-DD' });
		expect(state({ type: 'task', deadline: 'tomorrow' }, 'deadline').state).toBe('invalid-value');
		expect(state({ type: 'period', range: '2026-01-01 ~ 2026-01-07' }, 'range')).toEqual({ state: 'ok' });
		expect(state({ type: 'rules', 'dir-review': 'yes' }, 'dir-review').state).toBe('invalid-value');
		expect(state({ type: 'rules', 'dir-review': false }, 'dir-review')).toEqual({ state: 'ok' });
		expect(state({ schema: 1.5 }, 'schema').state).toBe('invalid-value');
	});

	it('treats empty values as fine, and skips kinds whose values are not resolvable yet', () => {
		expect(state({ type: 'task', status: null }, 'status')).toEqual({ state: 'ok' });
		expect(state({ type: 'task', project: 'SFI' }, 'project')).toEqual({ state: 'ok' });
		expect(state({ tags: ['anything'] }, 'tags')).toEqual({ state: 'ok' });
		expect(state({ type: 'task', related: [['x']] }, 'related')).toEqual({ state: 'ok' });
	});

	it('rejects a list where a single value is expected', () => {
		expect(state({ type: 'task', status: ['todo'] }, 'status').state).toBe('invalid-value');
	});
});

describe('validateNote: reserved keys win over every other rule', () => {
	it('reports a reserved key as reserved even when a custom schema declares it as a restrictive enum', () => {
		const custom: Schema = structuredClone(DEFAULT_SCHEMA);
		custom.fields.cssclasses = { kind: 'enum', source: { kind: 'static', values: [{ value: 'wide' }, { value: 'narrow' }] } };
		const parsed = parseSchema(custom);
		if (!parsed.ok) throw new Error(parsed.errors.join('; '));
		const cc = compileSchema(parsed.schema);
		expect(cc.fields.has('cssclasses')).toBe(true);
		expect(cc.reserved.has('cssclasses')).toBe(true);
		expect(validateNote(cc, { type: 'task', cssclasses: 'something-else' }).fields.cssclasses).toEqual({ state: 'reserved' });
	});
});

describe('validateNote: availability and emptiness', () => {
	it('review without an author is reported as an unmet condition', () => {
		expect(state({ type: 'task', review: 'none' }, 'review').state).toBe('condition-unmet');
	});

	it('an empty value on a field that does not belong to the type is still reported as a mismatch', () => {
		expect(state({ type: 'solution', priority: '' }, 'priority')).toEqual({
			state: 'type-mismatch',
			type: 'solution',
			allowedTypes: ['task'],
		});
	});

	it('an empty value on a field whose condition is unmet is still reported as an unmet condition', () => {
		expect(state({ type: 'task', author: 'human', review: '' }, 'review')).toEqual({
			state: 'condition-unmet',
			rule: expect.objectContaining({ id: 'review-needs-agent' }),
		});
	});
});

describe('validateNote: the type of the note', () => {
	it('is valid for a legal type', () => {
		expect(validateNote(c, { type: 'task' }).type).toEqual({ value: 'task', valid: true });
		expect(validateNote(c, { type: 'rules' }).type).toEqual({ value: 'rules', valid: true });
	});

	it('treats an empty type as no type, while the type field itself stays ok', () => {
		for (const empty of ['', null]) {
			const r = validateNote(c, { type: empty });
			expect(r.type).toEqual({ value: undefined, valid: false });
			expect(r.fields.type).toEqual({ state: 'ok' });
		}
	});
});

describe('validateNote: valid values are accepted', () => {
	it('accepts an integer and rejects other numbers', () => {
		expect(state({ schema: 1 }, 'schema')).toEqual({ state: 'ok' });
		expect(state({ schema: '1' }, 'schema').state).toBe('invalid-value');
	});

	it('accepts a well-formed date range and rejects malformed ones', () => {
		expect(state({ type: 'period', range: '2026-01-01 ~ 2026-01-07' }, 'range')).toEqual({ state: 'ok' });
		const bad = { state: 'invalid-value', allowed: [], format: 'YYYY-MM-DD ~ YYYY-MM-DD' };
		expect(state({ type: 'period', range: '2026-01-01' }, 'range')).toEqual(bad);
		expect(state({ type: 'period', range: '2026-01-01 - 2026-01-07' }, 'range')).toEqual(bad);
	});

	it('accepts YYYY-MM-DD for every date field and rejects other forms', () => {
		const cases: [Record<string, unknown>, string][] = [
			[{ author: 'agent', review: 'changed' }, 'reviewed'],
			[{ type: 'task' }, 'deadline'],
			[{ type: 'devlog' }, 'date'],
			[{ type: 'brief' }, 'deadline'],
		];
		for (const [props, key] of cases) {
			expect(state({ ...props, [key]: '2026-01-01' }, key)).toEqual({ state: 'ok' });
			expect(state({ ...props, [key]: '01/01/2026' }, key)).toEqual({
				state: 'invalid-value',
				allowed: [],
				format: 'YYYY-MM-DD',
			});
		}
	});

	it('accepts a date with or without the old time of day, and needs a space before the time', () => {
		expect(state({ updated: '2026-01-01' }, 'updated')).toEqual({ state: 'ok' });
		expect(state({ updated: '2026-01-01 10:00:00' }, 'updated')).toEqual({ state: 'ok' });
		for (const bad of ['2026-01-01T10:00:00', '2026-01-01 10:00', '2026-01-01 ']) {
			expect(state({ updated: bad }, 'updated'), bad).toEqual({ state: 'invalid-value', allowed: [], format: 'YYYY-MM-DD' });
		}
	});

	it('treats an empty string, an empty array and null as fine on an available field', () => {
		for (const empty of ['', [], null]) {
			expect(state({ type: 'task', status: empty }, 'status')).toEqual({ state: 'ok' });
		}
		expect(state({ type: 'rules', 'dir-accepts': [] }, 'dir-accepts')).toEqual({ state: 'ok' });
	});

	it('accepts a string or a list of legal values for a multi-enum, and rejects an illegal member', () => {
		expect(state({ type: 'rules', 'dir-accepts': 'task' }, 'dir-accepts')).toEqual({ state: 'ok' });
		expect(state({ type: 'rules', 'dir-accepts': ['task', 'devlog'] }, 'dir-accepts')).toEqual({ state: 'ok' });
		expect(state({ type: 'rules', 'dir-accepts': ['task', 'bogus'] }, 'dir-accepts').state).toBe('invalid-value');
	});

	it('rejects a boolean or a number where an enum value is expected', () => {
		expect(state({ type: 'task', status: false }, 'status').state).toBe('invalid-value');
		expect(state({ type: 'task', status: 0 }, 'status').state).toBe('invalid-value');
	});
});

describe('validateNote: keys that collide with Object.prototype', () => {
	it('keeps an own __proto__ key in the report and does not invent inherited ones', () => {
		const props = JSON.parse('{"__proto__": 1, "type": "task"}') as Record<string, unknown>;
		const r = validateNote(c, props);
		expect(Object.keys(r.fields)).toEqual(expect.arrayContaining(['__proto__', 'type']));
		expect(r.fields['__proto__']).toEqual({ state: 'unknown-field' });
		expect(r.fields['toString']).toBeUndefined();
	});
});
