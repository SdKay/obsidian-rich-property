import type { App } from 'obsidian';
import type { CompiledSchema } from '../../schema/compile';
import type { Props } from '../../schema/evaluate';
import type { FieldDef, FieldKind } from '../../schema/types';
import { enumEditor } from './enumPicker';
import { multiEditor } from './multiPicker';
import { noteEditor } from './notePicker';

export interface EditContext {
	app: App;
	key: string;
	def: FieldDef;
	props: Props;
	compiled: CompiledSchema;
	anchor: HTMLElement;
	write: (key: string, value: unknown) => Promise<void>;
}

/** Returns a function that opens the editor, or undefined when it has nothing legal to offer. */
export type Editor = (ctx: EditContext) => (() => void) | undefined;

// A kind that is absent here is never intercepted, so it keeps its native editor.
const EDITORS: Partial<Record<FieldKind, Editor>> = {
	enum: enumEditor,
	bool: enumEditor,
	'multi-enum': multiEditor,
	tags: multiEditor,
	link: noteEditor,
	'link-list': noteEditor,
};

export const editorFor = (kind: FieldKind): Editor | undefined => EDITORS[kind];
export const isEditable = (kind: FieldKind): boolean => kind in EDITORS;
