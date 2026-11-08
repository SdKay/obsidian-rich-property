import { describeText } from './i18n';

/** A menu entry title: the value, then its description in a fainter, smaller text. */
export function menuTitle(value: string, description?: string): string | DocumentFragment {
	const text = describeText(description);
	if (!text) return value;
	const frag = createFragment();
	frag.createSpan({ text: value });
	frag.createSpan({ cls: 'rp-menu-desc', text: `  ${text}` });
	return frag;
}
