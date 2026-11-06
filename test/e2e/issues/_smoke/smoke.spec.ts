import { test, expect } from '../../common/test-base';

// Proves the e2e wiring works end to end: the bundle builds, loads in a page, and the real
// source runs there. Delete this once a real e2e test exists.
test('the real bundle loads and runs in a page', async ({ page, loadReal }) => {
	await loadReal();
	const settings = await page.evaluate(() => window.RichPropertyReal.loadSettings(null));
	expect(settings).toEqual({ version: 1 });
});
