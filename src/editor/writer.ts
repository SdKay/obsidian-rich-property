import type { App, TFile } from 'obsidian';

export interface Writer {
	write(key: string, value: unknown): Promise<void>;
}

/**
 * The only place that writes frontmatter. processFrontMatter is an atomic read-modify-write, so a
 * concurrent edit of another key is not lost. It rewrites the whole block: comments are dropped
 * and quote and list styles are normalized. Measured in test/fixtures/dom/yaml-roundtrip.*; the body is untouched.
 */
export function createWriter(app: App, file: TFile): Writer {
	return {
		write: (key, value) =>
			app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				fm[key] = value;
			}),
	};
}
