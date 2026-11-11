// Writes a note that shows every colored value of the built-in preset, using the plugin's own badge
// markup, so what you see here is what the property panel shows. Run after changing preset colors.
// Usage: node scripts/gen-color-doc.mjs [vaultPath]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vault = process.argv[2] ?? process.env.RP_VAULT ?? '/mnt/c/Users/silas_xing/Documents/Obsidian';
const tmp = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'rp-colors-'));
await build({ entryPoints: [path.join(root, 'src/schema/presets/default.ts')], bundle: true, format: 'esm', outfile: path.join(tmp, 'preset.mjs'), platform: 'node', logLevel: 'error' });
const { DEFAULT_SCHEMA } = await import(path.join(tmp, 'preset.mjs'));
fs.rmSync(tmp, { recursive: true, force: true });

const MEANING = {
	red: 'Needs action now, or high risk',
	orange: 'To do, or take care',
	green: 'Done, confirmed, allowed',
	blue: 'In progress',
	neutral: 'Ended or replaced',
	purple: 'Every other value (plain)',
};
const order = ['red', 'orange', 'green', 'blue', 'neutral', 'purple'];
const fill = (c) => (c === 'neutral' ? 'var(--text-faint)' : `var(--color-${c})`);
const tint = (c, a) => (c === 'neutral' ? 'var(--background-modifier-hover)' : `rgba(var(--color-${c}-rgb),${a})`);

// Every look is an inline style: the reading view may drop <style> blocks, but it keeps style="...".
const BADGE = 'display:inline-block;padding:0 .6em;border-radius:var(--radius-m);font-weight:600;margin:2px 4px 2px 0';
const soft = (v, c) => `<span style="${BADGE};color:${fill(c)};border:1px solid ${fill(c)};background-color:${tint(c, 0.15)}">${v}</span>`;
const solid = (v, c) => `<span style="${BADGE};color:#fff;background-color:${fill(c)}">${v}</span>`;
const block = (c) => `<div style="display:flex;align-items:center;gap:1em;height:56px;padding:0 16px;margin:4px 0;border-radius:var(--radius-m);color:#fff;font-weight:600;background-color:${fill(c)}"><span>${c}</span><span style="font-weight:400">${MEANING[c]}</span></div>`;
const errRow = (c, name, value) => `<div style="display:flex;gap:1.5em;padding:6px 12px;margin:4px 0;border-left:4px solid ${fill(c)};background-color:${tint(c, 0.28)}"><b style="color:${fill(c)};text-decoration:underline wavy ${fill(c)};text-underline-offset:3px">${name}</b><span>${value}</span></div>`;

const byColor = new Map();
const add = (color, field, value, scope) => {
	if (!byColor.has(color)) byColor.set(color, []);
	byColor.get(color).push({ field, value, scope });
};
for (const [key, def] of Object.entries(DEFAULT_SCHEMA.fields)) {
	if (def.source?.kind !== 'static' || key === 'status') continue;
	for (const o of def.source.values) if (o.color) add(o.color, key, o.value, def.types?.join(', ') ?? '');
}
for (const rule of DEFAULT_SCHEMA.rules) {
	for (const e of rule.then) {
		if (e.effect !== 'values') continue;
		const type = rule.when[0]?.in?.[0] ?? '';
		for (const o of e.values) if (o.color) add(o.color, e.field, o.value, type);
	}
}

let md = `---\ntype: output\nauthor: agent\n---\n\n# Rich Property: value colors\n\nGenerated from the built-in preset by \`scripts/gen-color-doc.mjs\`.\n\n`;
md += `## The colors\n\n${order.map(block).join('\n')}\n`;

md += `\n## Two ways to show a value\n\nSoft is what the property panel shows now. Solid is a filled block.\n\n| Color | Soft | Solid |\n|---|---|---|\n`;
for (const c of order) md += `| ${c} | ${soft('sample', c)} | ${solid('sample', c)} |\n`;

md += `\n## Which values get which color\n`;
for (const c of order) {
	const items = byColor.get(c) ?? [];
	if (items.length === 0) continue;
	md += `\n### ${c[0].toUpperCase()}${c.slice(1)}: ${MEANING[c]}\n\n| Soft | Solid | Field | Applies to |\n|---|---|---|---|\n`;
	for (const it of items) md += `| ${soft(it.value, c)} | ${solid(it.value, c)} | \`${it.field}\` | ${it.scope || 'all types'} |\n`;
}

md += `\n## Error rows: pick a color\n\nA property that should not be there, or whose value is not allowed, is marked across the whole row.\n\n`;
for (const [id, c] of [['A', 'red'], ['B', 'pink'], ['C', 'orange'], ['D', 'purple']]) {
	md += `**${id}: ${c}**\n\n${errRow(c, 'status', 'in-progress')}\n${errRow(c, 'ai-first', 'true')}\n\n`;
}

const out = path.join(vault, 'tmp', 'rich-property-colors.md');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, md);
console.log(`wrote ${out}`);
