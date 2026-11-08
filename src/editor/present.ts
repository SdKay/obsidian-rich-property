import { fmt, t } from '../i18n';
import type { ColorToken, Condition, FieldReport, Option, Rule } from '../schema/types';

export type Presentation =
	| { kind: 'none' }
	| { kind: 'chip'; color: ColorToken | undefined; solid: boolean }
	| { kind: 'pills'; items: { value: string; color: ColorToken; solid: boolean }[] }
	| { kind: 'flag'; severity: 'warn'; message: string; css: string };

const list = (xs: string[]): string => xs.join(', ');

function conditionText(c: Condition): string {
	if ('exists' in c) return fmt(c.exists ? 'condSet' : 'condNotSet', { field: c.field });
	if ('in' in c) return fmt('condIs', { field: c.field, values: c.in.join(t('or')) });
	return fmt('condIsNot', { field: c.field, values: c.notIn.join(t('or')) });
}

/** All conditions of a rule as one phrase, joined by the rule's all/any wording. */
function ruleText(rule: Rule): string {
	return rule.when.map(conditionText).join(t(rule.match === 'all' ? 'and' : 'or'));
}

function show(v: unknown): string {
	return typeof v === 'string' ? v : JSON.stringify(v);
}

export function presentField(report: FieldReport, key: string, value: unknown, options: Option[] | undefined): Presentation {
	switch (report.state) {
		case 'reserved':
			return { kind: 'none' };
		case 'ok': {
			if (Array.isArray(value)) {
				const items = value.flatMap((v) => {
					const hit = typeof v === 'string' ? options?.find((o) => o.value === v) : undefined;
					return hit?.color ? [{ value: hit.value, color: hit.color, solid: hit.solid === true }] : [];
				});
				return items.length > 0 ? { kind: 'pills', items } : { kind: 'none' };
			}
			const hit = typeof value === 'string' ? options?.find((o) => o.value === value) : undefined;
			return hit?.color ? { kind: 'chip', color: hit.color, solid: hit.solid === true } : { kind: 'none' };
		}
		case 'invalid-value': {
			const message = report.format
				? fmt('invalidFormat', { value: show(value), key, format: report.format })
				: fmt('invalidValue', { value: show(value), key, allowed: list(report.allowed) });
			return { kind: 'flag', severity: 'warn', css: 'rp-flag', message };
		}
		case 'unknown-field':
			return { kind: 'flag', severity: 'warn', css: 'rp-flag', message: fmt('unknownField', { key }) };
		case 'type-mismatch':
			return {
				kind: 'flag', severity: 'warn', css: 'rp-flag',
				message: fmt('typeMismatch', { key, type: report.type, types: list(report.allowedTypes) }),
			};
		case 'condition-unmet':
			return {
				kind: 'flag', severity: 'warn', css: 'rp-flag',
				message: fmt('conditionUnmet', { key, condition: ruleText(report.rule) }),
			};
	}
}

export function presentationStamp(p: Presentation): string {
	if (p.kind === 'none') return 'none';
	if (p.kind === 'chip') return `chip:${p.color ?? ''}:${p.solid ? 'solid' : 'soft'}`;
	if (p.kind === 'pills') return `pills:${p.items.map((i) => `${i.value}=${i.color}${i.solid ? '!' : ''}`).join(',')}`;
	return `flag:${p.css}:${p.message}`;
}
