import type { ColorValue } from 'react-native';

export const FAVORITE_COLOR_MAP: Record<string, string> = {
	terracotta: '#E2725B',
	sage: '#9CAF88',
	navy: '#1B2A4B',
	blush: '#F5C6C6',
	emerald: '#2ECC71',
	gold: '#F7C948',
	lavender: '#C8A2C8',
	coral: '#FF6F61',
	teal: '#008DAB',
	charcoal: '#36454F',
	rose: '#E7ADAD',
	mint: '#B4E1C1',
	ivory: '#F6F1E0',
	'sky blue': '#87CEEB',
	denim: '#1E3A5F',
	olive: '#708238',
	mustard: '#D4A017',
	burgundy: '#800020',
	plum: '#8E4585',
	peach: '#FFCBA4',
	periwinkle: '#8CA6DB',
	sand: '#D7C4A0',
	pink: '#FFC0CB',
	red: '#FF6B6B',
	blue: '#3498DB',
	'light blue': '#7FB3FF',
	green: '#27AE60',
	'light green': '#7BD389',
	purple: '#9B59B6',
	yellow: '#F6C344',
	orange: '#F2994A',
	brown: '#8D5524',
	black: '#1F1F1F',
	white: '#FDFDFD',
	grey: '#95A5A6',
	gray: '#95A5A6',
	beige: '#F5F5DC',
	cream: '#F7F2E7',
	silver: '#C0C0C0',
	maroon: '#800000',
	turquoise: '#40E0D0',
	aqua: '#00FFFF',
	rust: '#C04E2C',
	magenta: '#FF00FF',
	violet: '#8F00FF',
	indigo: '#3F51B5',
	pearl: '#F8F6F0',
	amber: '#FFBF00',
	ruby: '#E0115F',
	copper: '#B87333',
};

export function normalizeFavoriteColor(color: string): string | null {
	const trimmed = color.trim();
	if (!trimmed) {
		return null;
	}
	const lowered = trimmed.toLowerCase();
	if (FAVORITE_COLOR_MAP[lowered]) {
		return FAVORITE_COLOR_MAP[lowered];
	}
	if (/^#([0-9a-f]{3}){1,2}$/i.test(trimmed)) {
		return trimmed;
	}
	const cssBasicNames = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'teal'];
	if (cssBasicNames.includes(lowered)) {
		return lowered;
	}
	return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const normalized = hex.replace('#', '');
	const length = normalized.length;
	if (length !== 3 && length !== 6) {
		return null;
	}
	const expanded = length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
	const parsed = parseInt(expanded, 16);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return {
		r: (parsed >> 16) & 255,
		g: (parsed >> 8) & 255,
		b: parsed & 255,
	};
}

export function withAlpha(color: ColorValue, alpha: number): string | null {
	if (typeof color !== 'string') {
		return null;
	}
	if (!color.startsWith('#')) {
		return null;
	}
	const rgb = hexToRgb(color);
	if (!rgb) {
		return null;
	}
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getReadableTextColor(color: string): string {
	const rgb = color.startsWith('#') ? hexToRgb(color) : null;
	if (!rgb) {
		return '#FFFFFF';
	}
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.6 ? '#1F1F1F' : '#FFFFFF';
}

