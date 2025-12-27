import { ASSETS_BASE } from '../config';

const isAbsoluteUrl = (s) => /^https?:\/\//i.test(String(s || ''));

export function resolveAssetUrl(value) {
	if (!value) return '';
	const v = String(value);
	if (!v) return '';
	if (v.startsWith('data:')) return v;
	if (isAbsoluteUrl(v)) return v;
	return `${ASSETS_BASE}${v}`;
}
