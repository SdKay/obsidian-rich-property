import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSettings, activeSlot } from '../src/settings';
import { resolveSchema } from '../src/schema/load';
import { validateNote } from '../src/schema/validate';

// These files are what version 0.1.0 wrote to data.json. They are frozen: a later release must read them
// exactly the same way, whatever happens to the built-in rules. Do not edit them to make a test pass.
const saved = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`test/fixtures/saved/${name}`, 'utf8')) as Record<string, unknown>;

describe('rules saved by version 0.1.0', () => {
	describe('a start from nothing with the user\'s own types, fields and rules', () => {
		const file = saved('v0.1.0-blank-start.json');
		const settings = loadSettings(file);
		const active = resolveSchema(activeSlot(settings), settings.blank);

		it('stays a start from nothing, with the saved rules kept as written', () => {
			expect(settings.blank).toBe(true);
			expect(settings.blankSchema).toEqual(file.blankSchema);
			expect(settings.customSchema).toBeNull();
		});

		it('is read without a single problem and in use', () => {
			expect(active.errors).toEqual([]);
			expect(active.usingStart).toBe(false);
		});

		it('keeps every field, type and rule the user made and adds none of the built-in ones', () => {
			expect([...active.compiled.fields.keys()]).toEqual(['type', 'status', 'estimate', 'owner', 'due', 'labels']);
			expect(active.compiled.schema.rules.map((r) => r.id)).toEqual(['estimate-when-open']);
			expect([...active.compiled.typeValues]).toEqual(['ticket', 'note']);
		});

		it('judges a note by the user\'s rules, not the built-in ones', () => {
			const report = validateNote(active.compiled, { type: 'ticket', status: 'open', estimate: 3, due: '2026-12-01' });
			expect(Object.values(report.fields).map((f) => f.state)).toEqual(['ok', 'ok', 'ok', 'ok']);
			expect(validateNote(active.compiled, { type: 'task' }).type.valid).toBe(false);
		});
	});

	describe('the built-in rules after the user edited them', () => {
		const file = saved('v0.1.0-edited-built-in.json');
		const settings = loadSettings(file);
		const active = resolveSchema(activeSlot(settings), settings.blank);

		it('keeps the styling switch, the choice of start and the saved rules as written', () => {
			expect(settings.styling).toBe(false);
			expect(settings.blank).toBe(false);
			expect(settings.customSchema).toEqual(file.customSchema);
		});

		it('uses the saved rules in full, with none of the built-in types or fields mixed in', () => {
			expect(active.usingStart).toBe(false);
			expect(active.errors).toEqual([]);
			expect([...active.compiled.fields.keys()]).toEqual(['type', 'status', 'project', 'note-to-self']);
			expect([...active.compiled.typeValues]).toEqual(['task', 'my-own-type']);
			expect(active.compiled.schema.rules).toEqual([]);
		});
	});

	it('never writes to what it was given', () => {
		const file = saved('v0.1.0-blank-start.json');
		const before = JSON.stringify(file);
		const settings = loadSettings(file);
		resolveSchema(activeSlot(settings), settings.blank);
		expect(JSON.stringify(file)).toBe(before);
	});
});
