// Bundles scripts/rich-property-cli.ts into the skill as one dependency-free Node file.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
	entryPoints: [path.join(root, 'scripts/rich-property-cli.ts')],
	outfile: path.join(root, 'skills/obsidian-rich-property/scripts/rich-property.cjs'),
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	logLevel: 'error',
});
console.log('built skills/obsidian-rich-property/scripts/rich-property.cjs');
