// Copies the build output into the vault's plugin folder and the fixture notes into the vault's
// tmp/ scratch area (not tracked by the vault's git).
// Usage: node scripts/dev-sync.mjs <vaultPath>   (or set RP_VAULT)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const vault = args.find((a) => !a.startsWith('--')) ?? process.env.RP_VAULT;
if (!vault) {
	console.error('Give the vault folder as an argument, or set RP_VAULT');
	process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pluginDir = path.join(vault, '.obsidian', 'plugins', manifest.id);

for (const f of ['main.js', 'manifest.json', 'styles.css']) {
	if (!fs.existsSync(path.join(root, f))) {
		console.error(`${f} is missing: run "node esbuild.config.mjs production" first`);
		process.exit(1);
	}
}

fs.mkdirSync(pluginDir, { recursive: true });
for (const f of ['main.js', 'manifest.json', 'styles.css']) fs.copyFileSync(path.join(root, f), path.join(pluginDir, f));

const communityFile = path.join(vault, '.obsidian', 'community-plugins.json');
const enabled = fs.existsSync(communityFile) ? JSON.parse(fs.readFileSync(communityFile, 'utf8')) : [];
if (!enabled.includes(manifest.id)) fs.writeFileSync(communityFile, JSON.stringify([...enabled, manifest.id]));

const fixtures = path.join(root, 'test', 'fixtures', 'vault');
const fixtureDir = path.join(vault, 'tmp', 'rich-property-fixtures');
fs.mkdirSync(fixtureDir, { recursive: true });
for (const f of fs.readdirSync(fixtures)) fs.copyFileSync(path.join(fixtures, f), path.join(fixtureDir, f));

console.log(`synced ${manifest.id} and fixtures to ${vault}`);
