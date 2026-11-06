import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings } from '../src/settings';

describe('loadSettings', () => {
	it('returns the defaults when nothing was saved', () => {
		expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps what was saved', () => {
		expect(loadSettings({ version: 3 }).version).toBe(3);
	});

	it('falls back to the default for a value of the wrong type, so a damaged file cannot break the plugin', () => {
		expect(loadSettings({ version: 'x' as never }).version).toBe(DEFAULT_SETTINGS.version);
	});

	it('does not hand out the defaults object itself', () => {
		const loaded = loadSettings(null);
		expect(loaded).not.toBe(DEFAULT_SETTINGS);
	});
});
