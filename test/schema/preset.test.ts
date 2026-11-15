import { describe, it, expect } from 'vitest';
import { DEFAULT_SCHEMA } from '../../src/schema/presets/default';
import { parseSchema } from '../../src/schema/parse';
import { compileSchema } from '../../src/schema/compile';
import type { FieldKind } from '../../src/schema/types';
import { availabilityOf, missingFields, resolveOptions } from '../../src/schema/evaluate';

const c = compileSchema(DEFAULT_SCHEMA);
const values = (key: string, props: Record<string, unknown>) => resolveOptions(c, key, props)?.map((o) => o.value);

describe('default preset', () => {
	it('passes its own parser, so a typo in the preset fails here', () => {
		const r = parseSchema(DEFAULT_SCHEMA);
		expect(r.ok).toBe(true);
	});

	it('has the 12 types', () => {
		expect(values('type', {})).toEqual([
			'capture', 'reference', 'output', 'decision', 'task', 'devlog',
			'solution', 'period', 'knowledge', 'brief', 'moc', 'rules',
		]);
	});

	it('picks status values by type (acceptance 1 and 2)', () => {
		expect(values('status', { type: 'task' })).toEqual(['todo', 'doing', 'blocked', 'done']);
		expect(values('status', { type: 'solution' })).toEqual(['draft', 'stable', 'superseded']);
		expect(values('status', { type: 'brief' })).toEqual(['planned', 'active', 'paused', 'done']);
		expect(values('status', { type: 'decision' })).toEqual(['proposed', 'accepted', 'superseded']);
		expect(values('status', { type: 'output' })).toEqual(['draft', 'final', 'superseded']);
	});

	it('colors review as none orange, reviewed green, changed red (FR-4)', () => {
		const colors = Object.fromEntries((resolveOptions(c, 'review', { author: 'agent' }) ?? []).map((o) => [o.value, o.color]));
		expect(colors).toEqual({ none: 'orange', reviewed: 'green', changed: 'red' });
	});

	it('shows the extra fields of each type as placeholders', () => {
		expect(missingFields(c, { type: 'task' })).toEqual(['project', 'status', 'priority', 'related', 'deadline']);
		expect(missingFields(c, { type: 'brief' })).toEqual(['project', 'project-mode', 'customer', 'platform', 'status', 'deadline']);
		expect(missingFields(c, { type: 'solution' })).toEqual(['project', 'status', 'related', 'verified-at']);
		expect(missingFields(c, { type: 'decision' })).toEqual(['project', 'status', 'supersedes', 'superseded_by', 'related']);
		expect(missingFields(c, { type: 'output' })).toEqual(['project', 'status', 'supersedes', 'superseded_by', 'related']);
		expect(missingFields(c, { type: 'devlog' })).toEqual(['project', 'date', 'tasks']);
		expect(missingFields(c, { type: 'period' })).toEqual(['range']);
		expect(missingFields(c, { type: 'knowledge' })).toEqual([]);
		expect(missingFields(c, { type: 'rules' })).toEqual([
			'dir-accepts', 'dir-audience', 'dir-ai-edit', 'dir-ai-create', 'dir-review', 'dir-lifecycle',
		]);
	});
});

describe('default preset field order', () => {
	const GENERAL_ONE = ['type', 'review', 'reviewed', 'author', 'audience', 'ai-edit', 'tags'];
	const GENERAL_TWO = ['created', 'updated', 'schema'];

	it('puts the general fields first, the type fields in the middle, and the closing general fields last', () => {
		const keys = Object.keys(DEFAULT_SCHEMA.fields);
		expect(keys.slice(0, GENERAL_ONE.length)).toEqual(GENERAL_ONE);
		expect(keys.slice(-GENERAL_TWO.length)).toEqual(GENERAL_TWO);
	});

	it('ends the type-specific block with deadline, and keeps the dir fields in it', () => {
		const middle = Object.keys(DEFAULT_SCHEMA.fields).slice(7, -3);
		expect(middle.indexOf('deadline')).toBe(middle.indexOf('range') + 1);
		expect(middle.slice(-6)).toEqual(['dir-accepts', 'dir-audience', 'dir-ai-edit', 'dir-ai-create', 'dir-review', 'dir-lifecycle']);
	});
});

const TYPES = [
	'capture', 'reference', 'output', 'decision', 'task', 'devlog',
	'solution', 'period', 'knowledge', 'brief', 'moc', 'rules',
];
const AI_EDIT = ['forbidden', 'ask', 'allowed'];
const AUDIENCE = ['ai', 'both', 'human'];

describe('default preset tag vocabulary', () => {
	it('has the six axes with their labels, prefixes, ordered values and bare wifi', () => {
		const source = DEFAULT_SCHEMA.fields.tags?.source;
		expect(source?.kind).toBe('tag-vocab');
		if (source?.kind !== 'tag-vocab') return;
		const expected = [
			{ label: 'Wi-Fi', prefix: 'wifi', values: ['p2p', 'whc', 'fw', 'mesh', 'dfs'], allowBare: true },
			{ label: 'Software component', prefix: 'sw', values: ['zephyr', 'freertos', 'linux'], allowBare: undefined },
			{ label: 'Architecture', prefix: 'arch', values: ['arm', 'riscv'], allowBare: undefined },
			{ label: 'Hardware IP', prefix: 'ip', values: ['sdio', 'gspi', 'uart', 'dma', 'cache', 'flash', 'mpu', 'pmc', 'otp', 'ipc'], allowBare: undefined },
			{ label: 'System', prefix: 'sys', values: ['security', 'power', 'mcuboot', 'bootloader', 'tfm'], allowBare: undefined },
			{ label: 'Misc', prefix: 'misc', values: ['debug', 'tools', 'build', 'test'], allowBare: undefined },
		];
		// Colors are a design choice, not part of the vault rules, so only names and order are pinned.
		expect(source.axes.map((a) => ({ label: a.label, prefix: a.prefix, values: a.values.map((o) => o.value), allowBare: a.allowBare }))).toStrictEqual(expected);
	});

	it('allows a bare tag on the wifi axis only', () => {
		const source = DEFAULT_SCHEMA.fields.tags?.source;
		expect(source?.kind).toBe('tag-vocab');
		if (source?.kind !== 'tag-vocab') return;
		expect(source.axes.filter((a) => a.allowBare).map((a) => a.prefix)).toEqual(['wifi']);
	});
});

describe('default preset reserved keys', () => {
	it('lists exactly the 12 plugin-reserved keys', () => {
		expect(DEFAULT_SCHEMA.reserved).toEqual([
			'excalidraw-plugin', 'kanban-plugin', 'cssclasses', 'aliases', 'banner', 'banner_x',
			'highlighter', 'lineNumbers', 'transition', 'theme', 'css', 'drawings',
		]);
	});
});

describe('default preset field kinds', () => {
	const KINDS: Record<string, FieldKind> = {
		type: 'enum', author: 'enum', audience: 'enum', 'ai-edit': 'enum', review: 'enum', project: 'enum', 'project-mode': 'enum',
		status: 'enum', priority: 'enum', 'dir-audience': 'enum', 'dir-ai-edit': 'enum', 'dir-ai-create': 'enum',
		'dir-lifecycle': 'enum',
		'dir-accepts': 'multi-enum',
		'dir-review': 'bool',
		reviewed: 'date', deadline: 'date', date: 'date',
		customer: 'text', platform: 'text-list', 'verified-at': 'text-list',
		created: 'datetime', updated: 'datetime',
		range: 'date-range',
		supersedes: 'link', superseded_by: 'link',
		related: 'link-list', tasks: 'link-list',
		schema: 'int',
		tags: 'tags',
	};

	it('has no field outside the table and none missing', () => {
		expect(Object.keys(DEFAULT_SCHEMA.fields).sort()).toEqual(Object.keys(KINDS).sort());
	});

	it.each(Object.entries(KINDS))('%s is a %s field', (key, kind) => {
		expect(DEFAULT_SCHEMA.fields[key]?.kind).toBe(kind);
	});
});

describe('default preset static enum values', () => {
	it.each([
		['author', ['human', 'agent', 'mixed']],
		['audience', AUDIENCE],
		['ai-edit', AI_EDIT],
		['review', ['none', 'reviewed', 'changed']],
		['priority', ['low', 'medium', 'high']],
		['dir-audience', AUDIENCE],
		['dir-ai-edit', AI_EDIT],
		['dir-ai-create', AI_EDIT],
		['dir-lifecycle', ['active', 'archived']],
		['project-mode', ['full', 'light']],
		['dir-accepts', TYPES],
	])('%s offers its values in order', (key, expected) => {
		expect(values(key, {})).toEqual(expected);
	});
});

describe('default preset conditions (requirements 3.1)', () => {
	it('offers review only when author includes an agent', () => {
		expect(availabilityOf(c, 'review', { author: 'agent' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'mixed' }).available).toBe(true);
		expect(availabilityOf(c, 'review', { author: 'human' }).available).toBe(false);
	});

	it('offers reviewed only after a review has happened', () => {
		expect(availabilityOf(c, 'reviewed', { review: 'reviewed' }).available).toBe(true);
		expect(availabilityOf(c, 'reviewed', { review: 'changed' }).available).toBe(true);
		expect(availabilityOf(c, 'reviewed', { review: 'none' }).available).toBe(false);
	});
});

describe('default preset type limits', () => {
	const LIMITS: Record<string, string[]> = {
		project: ['brief', 'solution', 'task', 'decision', 'devlog', 'output'],
		'project-mode': ['brief'],
		status: ['brief', 'solution', 'task', 'decision', 'output'],
		customer: ['brief'],
		platform: ['brief'],
		'verified-at': ['solution'],
		priority: ['task'],
		deadline: ['brief', 'task'],
		related: ['solution', 'task', 'decision', 'output'],
		supersedes: ['decision', 'output'],
		superseded_by: ['decision', 'output'],
		date: ['devlog'],
		tasks: ['devlog'],
		range: ['period'],
		'dir-accepts': ['rules'],
		'dir-audience': ['rules'],
		'dir-ai-edit': ['rules'],
		'dir-ai-create': ['rules'],
		'dir-review': ['rules'],
		'dir-lifecycle': ['rules'],
	};

	it.each(Object.entries(LIMITS))('%s is limited to its types', (key, allowed) => {
		for (const type of TYPES) {
			expect(availabilityOf(c, key, { type }).available, `${key} under ${type}`).toBe(allowed.includes(type));
		}
	});

	it('leaves the general fields available under every type', () => {
		for (const key of ['author', 'audience', 'ai-edit', 'created', 'updated', 'tags', 'schema']) {
			for (const type of TYPES) expect(availabilityOf(c, key, { type }).available, `${key} under ${type}`).toBe(true);
		}
	});
});

describe('default preset sources', () => {
	it('draws project from the active projects directory', () => {
		expect(DEFAULT_SCHEMA.fields.project?.source).toEqual({ kind: 'vault-dir', paths: ['2-projects'], requireFile: 'brief.md', depth: 2 });
	});

	it('searches the decisions and output folders for supersedes and superseded_by', () => {
		expect(DEFAULT_SCHEMA.fields.supersedes?.source).toEqual({ kind: 'note-search', folders: ['decisions', 'output'] });
		expect(DEFAULT_SCHEMA.fields.superseded_by?.source).toEqual({ kind: 'note-search', folders: ['decisions', 'output'] });
	});
});
