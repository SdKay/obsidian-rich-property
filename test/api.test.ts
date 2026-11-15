import { describe, it, expect, vi } from 'vitest';
import { createApi } from '../src/api';
import { resolveSchema } from '../src/schema/load';
import { blankSchema } from '../src/schema/blank';

const fakePlugin = (blank = false) => ({ app: { vault: { getAbstractFileByPath: () => null } }, active: resolveSchema(blank ? blankSchema() : null) }) as never;

describe('the property API', () => {
	it('says it is version 1 and cannot be changed by the caller', () => {
		const { api } = createApi(fakePlugin());
		expect(api.apiVersion).toBe(1);
		expect(Object.isFrozen(api)).toBe(true);
	});

	it('answers from the rules in use at the moment of the call, not from when it was made', () => {
		const plugin = fakePlugin();
		const { api } = createApi(plugin);
		expect(api.fields().length).toBeGreaterThan(20);
		(plugin as { active: unknown }).active = resolveSchema({ schemaVersion: 2, typeField: 'type', reserved: [], rules: [], fields: { type: { kind: 'enum', source: { kind: 'static', values: [{ value: 'only' }] } } } });
		expect(api.fields().map((f) => f.key)).toEqual(['type']);
		expect(api.valuesOf('type')?.map((v) => v.value)).toEqual(['only']);
	});

	it('gives an empty list, not nothing, for the type of a start from nothing', () => {
		const { api } = createApi(fakePlugin(true));
		expect(api.fields().map((f) => f.key)).toEqual(['type']);
		expect(api.valuesOf('type')).toEqual([]);
	});

	it('has no values for a folder-sourced property when the folder cannot be read', () => {
		expect(createApi(fakePlugin()).api.valuesOf('project')).toBeUndefined();
	});

	describe('onChange', () => {
		it('calls every listener, and stops calling one that unsubscribed', () => {
			const { api, notify } = createApi(fakePlugin());
			const a = vi.fn();
			const b = vi.fn();
			const stopA = api.onChange(a);
			api.onChange(b);
			notify();
			stopA();
			notify();
			expect(a).toHaveBeenCalledTimes(1);
			expect(b).toHaveBeenCalledTimes(2);
		});

		it('keeps calling the others when one listener throws', () => {
			const { api, notify } = createApi(fakePlugin());
			const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
			const after = vi.fn();
			api.onChange(() => {
				throw new Error('boom');
			});
			api.onChange(after);
			expect(() => notify()).not.toThrow();
			expect(after).toHaveBeenCalledTimes(1);
			quiet.mockRestore();
		});

		it('does not call a listener added while the others are being called until the next change', () => {
			const { api, notify } = createApi(fakePlugin());
			const late = vi.fn();
			api.onChange(() => {
				api.onChange(late);
			});
			notify();
			expect(late).not.toHaveBeenCalled();
		});

		it('lets a listener unsubscribe itself while being called', () => {
			const { api, notify } = createApi(fakePlugin());
			const calls: string[] = [];
			const stop = api.onChange(() => {
				calls.push('first');
				stop();
			});
			api.onChange(() => calls.push('second'));
			notify();
			notify();
			expect(calls).toEqual(['first', 'second', 'second']);
		});
	});
});
