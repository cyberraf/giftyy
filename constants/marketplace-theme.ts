/**
 * Giftyy Marketplace Theme
 * Premium marketplace design system with brand colors and design tokens
 */

export const MARKETPLACE_THEME = {
	colors: {
		primary: '#f75507',
		primaryLight: '#ff6b1a',
		primaryDark: '#e04500',
		white: '#ffffff',
		background: '#ffffff',
		backgroundSecondary: '#fafafa',
		text: '#111827',
		textSecondary: '#6b7280',
		textTertiary: '#9ca3af',
		border: '#e5e7eb',
		borderLight: '#f3f4f6',
		success: '#16a34a',
		error: '#ef4444',
		warning: '#f59e0b',
		// Emotional warm tones
		peach: '#ffe5d4',
		cream: '#fff8f0',
		pink: '#ffe0e6',
		softOrange: '#fff0e8',
		// Shades
		gray50: '#f9fafb',
		gray100: '#f3f4f6',
		gray200: '#e5e7eb',
		gray300: '#d1d5db',
		gray400: '#9ca3af',
		gray500: '#6b7280',
		gray600: '#4b5563',
		gray700: '#374151',
		gray800: '#1f2937',
		gray900: '#111827',
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		'2xl': 24,
		'3xl': 32,
		'4xl': 40,
	},
	typography: {
		fontFamily: 'Cooper BT',
		sizes: {
			xs: 10,
			sm: 11,
			base: 13,
			md: 14,
			lg: 16,
			xl: 18,
			'2xl': 20,
			'3xl': 24,
			'4xl': 28,
		},
		weights: {
			normal: '400',
			medium: '500',
			semibold: '600',
			bold: '700',
			extrabold: '800',
			black: '900',
		},
	},
	borderRadius: {
		sm: 8,
		md: 12,
		lg: 16,
		xl: 20,
		full: 9999,
	},
	shadows: {
		sm: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.05,
			shadowRadius: 2,
			elevation: 2,
		},
		md: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.08,
			shadowRadius: 8,
			elevation: 3,
		},
		lg: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.12,
			shadowRadius: 16,
			elevation: 5,
		},
	},
	gradients: {
		primary: ['#f75507', '#ff6b1a'],
		warm: ['#ffe5d4', '#fff0e8'],
		hero: ['#f75507', '#ff6b1a', '#fff0e8'],
	},
	animations: {
		duration: {
			fast: 150,
			normal: 300,
			slow: 500,
		},
		easing: {
			easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
			easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
			easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
		},
	},
} as const;

export type MarketplaceTheme = typeof MARKETPLACE_THEME;

