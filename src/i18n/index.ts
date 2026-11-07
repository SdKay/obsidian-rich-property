import { getLanguage } from 'obsidian';
import { en, type Dict } from './en';
import { zh } from './zh';
import { de } from './de';
import { fr } from './fr';
import { ja } from './ja';
import { ko } from './ko';

/** Adding a language: add `src/i18n/<code>.ts` (typed `Dict`) and one line here. */
const DICTS: Record<string, Dict> = { en, zh, de, fr, ja, ko };

/** The Obsidian UI language reduced to a key of DICTS; anything unsupported is English. */
export function currentLang(): string {
	const code = getLanguage().toLowerCase().split(/[-_]/)[0] ?? 'en';
	return code in DICTS ? code : 'en';
}

export type I18nKey = keyof typeof en;

export function t(key: I18nKey): string {
	return (DICTS[currentLang()] ?? en)[key];
}

/** A stored description is either the user's own text or `i18n:<key>` for a built-in one. */
export function describeText(stored: string | undefined): string {
	if (!stored) return '';
	if (!stored.startsWith('i18n:')) return stored;
	const key = stored.slice('i18n:'.length) as I18nKey;
	return key in en ? t(key) : '';
}

/** Fills `{name}` placeholders in the translated string for `key`. */
export function fmt(key: I18nKey, vars: Record<string, string | number>): string {
	return t(key).replace(/\{(\w+)\}/g, (whole, name: string) => String(vars[name] ?? whole));
}
