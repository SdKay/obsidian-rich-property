// Command line tool bundled into the agent skill (see esbuild at the bottom of scripts/build-skill.mjs).
// It uses the plugin's own parser, so a schema it accepts is a schema the plugin accepts.
import fs from 'node:fs';
import path from 'node:path';
import { blankSchema } from '../src/schema/blank';
import { parseSchema } from '../src/schema/parse';
import { DEFAULT_SCHEMA } from '../src/schema/presets/default';

const USAGE = `rich-property: check and install property rules for the Rich Property plugin

  preset [--blank]                 print the built-in rules (or the empty start) as JSON
  validate <rules.json>            check a rules file; exit 1 and list every problem if it is not valid
  install  <rules.json> <vault> [--blank]
                                   check, then write the rules into <vault>/.obsidian/plugins/rich-property/data.json
                                   (the built-in start by default, the "start from scratch" slot with --blank).
                                   The old file is copied to data.json.bak first. Close the plugin in Obsidian
                                   before running this, or Obsidian may write its old settings back.
`;

function readJson(file: string): unknown {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (err) {
		console.error(`cannot read ${file} as JSON: ${(err as Error).message}`);
		process.exit(2);
	}
}

function check(rules: unknown): void {
	const result = parseSchema(rules);
	if (result.ok) return;
	console.error(`${result.errors.length} problem(s):`);
	for (const e of result.errors) console.error(`  - ${e}`);
	process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith('--'));
const args = rest.filter((a) => !a.startsWith('--'));
const blank = flags.includes('--blank');

if (command === 'preset') {
	console.log(JSON.stringify(blank ? blankSchema() : DEFAULT_SCHEMA, null, 2));
} else if (command === 'validate' && args[0]) {
	check(readJson(args[0]));
	console.log('valid');
} else if (command === 'install' && args[0] && args[1]) {
	const rules = readJson(args[0]);
	check(rules);
	const dir = path.join(args[1], '.obsidian', 'plugins', 'rich-property');
	if (!fs.existsSync(dir)) {
		console.error(`${dir} does not exist: install and enable the Rich Property plugin in that vault first`);
		process.exit(2);
	}
	const file = path.join(dir, 'data.json');
	const existed = fs.existsSync(file);
	const current = existed ? (readJson(file) as Record<string, unknown>) : {};
	if (existed) fs.copyFileSync(file, `${file}.bak`);
	const next = { ...current, ...(blank ? { blank: true, blankSchema: rules } : { customSchema: rules }) };
	fs.writeFileSync(file, JSON.stringify(next, null, 2));
	console.log(`wrote ${blank ? 'blankSchema' : 'customSchema'} to ${file}${existed ? ' (previous file kept as data.json.bak)' : ''}`);
	console.log('Reload the plugin in Obsidian (Settings > Community plugins, switch Rich Property off and on) to use it.');
} else {
	console.log(USAGE);
	process.exit(command ? 2 : 0);
}
