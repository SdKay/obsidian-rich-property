import type { ColorToken, FieldDef, Option, Rule, Schema } from '../types';

const TYPES = [
	'capture', 'reference', 'output', 'decision', 'task', 'devlog',
	'solution', 'period', 'knowledge', 'brief', 'moc', 'rules',
];

// Color is reserved for values that call for attention. Meaning is the same everywhere:
//   red    needs action now, or high risk       orange  to do, or take care
//   green  done, confirmed, allowed             blue    in progress
//   gray   ended or replaced                    purple  every other value (see PLAIN), so it never competes
const PLAIN: ColorToken = 'purple';

const opt = (value: string, color?: ColorToken, description?: string): Option => ({
	value,
	...(color ? { color } : {}),
	...(description ? { description: `i18n:val.${description}` } : {}),
});
const plain = (values: string[], group?: string): Option[] => values.map((v) => opt(v, PLAIN, group ? `${group}.${v}` : undefined));
const enumOf = (values: Option[], extra: Partial<FieldDef> = {}): FieldDef => ({
	kind: 'enum',
	source: { kind: 'static', values },
	...extra,
});
const onTypes = (...types: string[]): Pick<FieldDef, 'types'> => ({ types });

const STATUS_BY_TYPE: Record<string, Option[]> = {
	brief: [opt('planned', 'orange'), opt('active', 'green'), opt('paused', 'orange'), opt('done', 'green')],
	solution: [opt('draft', 'orange'), opt('stable', 'green'), opt('superseded', 'neutral')],
	task: [opt('todo', PLAIN), opt('doing', 'blue'), opt('blocked', 'red'), opt('done', 'green')],
	decision: [opt('proposed', 'orange'), opt('accepted', 'green'), opt('superseded', 'neutral')],
};
// The union of every type's values; a value shared by several types keeps the first type's color.
const STATUS_FALLBACK = Object.values(STATUS_BY_TYPE)
	.flat()
	.filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i);

const RULES: Rule[] = [
	{
		id: 'review-needs-agent',
		match: 'all',
		when: [{ field: 'author', in: ['agent', 'mixed'] }],
		then: [{ field: 'review', effect: 'available' }],
	},
	{
		id: 'reviewed-needs-review',
		match: 'all',
		when: [{ field: 'review', in: ['reviewed', 'changed'] }],
		then: [{ field: 'reviewed', effect: 'available' }],
	},
	...Object.entries(STATUS_BY_TYPE).map(([type, values]): Rule => ({
		id: `status-for-${type}`,
		match: 'all',
		when: [{ field: 'type', in: [type] }],
		then: [{ field: 'status', effect: 'values', values }],
	})),
];

const AI_EDIT = [opt('forbidden', 'red', 'edit.forbidden'), opt('ask', 'orange', 'edit.ask'), opt('allowed', 'green', 'edit.allowed')];
const AUDIENCE = [opt('ai', PLAIN, 'audience.ai'), opt('both', PLAIN, 'audience.both'), opt('human', 'orange', 'audience.human')];

const BUILT_IN: Schema = {
	schemaVersion: 2,
	typeField: 'type',
	reserved: [
		'excalidraw-plugin', 'kanban-plugin', 'cssclasses', 'aliases', 'banner', 'banner_x',
		'highlighter', 'lineNumbers', 'transition', 'theme', 'css', 'drawings',
	],
	rules: RULES,
	fields: {
		type: enumOf(plain(TYPES, 'type')),
		review: enumOf([opt('none', 'orange', 'review.none'), opt('reviewed', 'green', 'review.reviewed'), opt('changed', 'red', 'review.changed')]),
		reviewed: { kind: 'date' },
		author: enumOf(plain(['human', 'agent', 'mixed'])),
		audience: enumOf(AUDIENCE),
		'ai-edit': enumOf(AI_EDIT),
		tags: {
			kind: 'tags',
			source: {
				kind: 'tag-vocab',
				axes: [
					{ label: 'Wi-Fi', prefix: 'wifi', values: plain(['p2p', 'whc', 'fw', 'mesh', 'dfs']), allowBare: true, bare: { color: PLAIN } },
					{ label: 'Software component', prefix: 'sw', values: plain(['zephyr', 'freertos', 'linux']) },
					{ label: 'Architecture', prefix: 'arch', values: plain(['arm', 'riscv']) },
					{ label: 'Hardware IP', prefix: 'ip', values: plain(['sdio', 'gspi', 'uart', 'dma', 'cache', 'flash', 'mpu', 'pmc', 'otp', 'ipc']) },
					{ label: 'System', prefix: 'sys', values: plain(['security', 'power', 'mcuboot', 'bootloader', 'tfm']) },
					{ label: 'Misc', prefix: 'misc', values: plain(['debug', 'tools', 'build', 'test']) },
				],
			},
		},

		project: {
			kind: 'enum',
			source: { kind: 'vault-dir', paths: ['2-projects'], requireFile: 'brief.md', depth: 2 },
			...onTypes('brief', 'solution', 'task', 'decision', 'devlog'),
		},
		customer: { kind: 'text', ...onTypes('brief') },
		platform: { kind: 'text-list', ...onTypes('brief') },
		status: {
			kind: 'enum',
			source: { kind: 'static', values: STATUS_FALLBACK },
			...onTypes('brief', 'solution', 'task', 'decision'),
		},
		priority: enumOf([opt('low', PLAIN), opt('medium', 'orange'), opt('high', 'red')], onTypes('task')),
		supersedes: { kind: 'link', source: { kind: 'note-search', folder: 'decisions' }, ...onTypes('decision') },
		superseded_by: { kind: 'link', source: { kind: 'note-search', folder: 'decisions' }, ...onTypes('decision') },
		related: { kind: 'link-list', source: { kind: 'note-search' }, ...onTypes('solution', 'task', 'decision') },
		'verified-at': {
			kind: 'text-list',
			pattern: '^[^@\\s]+@[^:\\s]+:[0-9a-f]{10}$',
			patternHint: '<repo>@<branch>:<10 hex>',
			...onTypes('solution'),
		},
		date: { kind: 'date', ...onTypes('devlog') },
		tasks: { kind: 'link-list', source: { kind: 'note-search' }, ...onTypes('devlog') },
		range: { kind: 'date-range', ...onTypes('period') },
		deadline: { kind: 'date', ...onTypes('brief', 'task') },
		'dir-accepts': { kind: 'multi-enum', source: { kind: 'static', values: plain(TYPES, 'type') }, ...onTypes('rules') },
		'dir-audience': enumOf(AUDIENCE, onTypes('rules')),
		'dir-ai-edit': enumOf(AI_EDIT, onTypes('rules')),
		'dir-ai-create': enumOf(AI_EDIT, onTypes('rules')),
		'dir-review': { kind: 'bool', ...onTypes('rules') },
		'dir-lifecycle': enumOf([opt('active', PLAIN), opt('archived', 'neutral', 'lifecycle.archived')], onTypes('rules')),

		created: { kind: 'datetime' },
		updated: { kind: 'datetime' },
		schema: { kind: 'int' },
	},
};

/** Fields that have a description in AGENT.md 4.1; the key is an i18n entry so it follows the UI language. */
const DESCRIBED = [
	'type', 'created', 'updated', 'tags', 'author', 'audience', 'ai-edit', 'review', 'reviewed', 'schema',
	'project', 'customer', 'platform', 'verified-at', 'status', 'priority', 'deadline', 'date', 'range', 'related', 'tasks', 'supersedes', 'superseded_by',
	'dir-accepts', 'dir-audience', 'dir-ai-edit', 'dir-ai-create', 'dir-review', 'dir-lifecycle',
];

export const DEFAULT_SCHEMA: Schema = {
	...BUILT_IN,
	fields: Object.fromEntries(
		Object.entries(BUILT_IN.fields).map(([key, def]) => [key, DESCRIBED.includes(key) ? { ...def, description: `i18n:desc.${key}` } : def]),
	),
};
