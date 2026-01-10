/**
 * Giftyy Premium Marketplace Theme
 * Combines Etsy/Temu practicality with Giftyy's emotional, gift-focused identity
 */

import { Dimensions, Platform } from 'react-native';
import { scale, moderateScale, normalizeFont } from '@/utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const GIFTYY_THEME = {
	// Primary Brand Colors
	colors: {
		primary: '#f75507', // Giftyy orange
		primaryDark: '#d44605',
		primaryLight: '#ff6d2a',
		white: '#ffffff',
		black: '#000000',
		
		// Supporting Emotional Tones
		peach: '#ffb799',
		cream: '#fff5f0',
		pink: '#ffe5e5',
		softPink: '#fff0f5',
		
		// Neutral Grays
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
		
		// Semantic Colors
		success: '#16a34a',
		error: '#ef4444',
		warning: '#f59e0b',
		info: '#3b82f6',
		
		// Marketplace Specific
		discount: '#ef4444',
		newBadge: '#22c55e',
		saleBadge: '#f75507',
		featured: '#fbbf24',
		
		// Backgrounds
		background: '#ffffff',
		backgroundSecondary: '#fafafa', // Slightly lighter than gray50 for subtle distinction
		cardBackground: '#ffffff',
		overlay: 'rgba(0, 0, 0, 0.3)',
		
		// Text Colors (for compatibility with MARKETPLACE_THEME)
		text: '#111827',
		textSecondary: '#6b7280',
		textTertiary: '#9ca3af',
		
		// Border Colors (for compatibility with MARKETPLACE_THEME)
		border: '#e5e7eb',
		borderLight: '#f3f4f6',
	},
	
	// Typography
	typography: {
		fontFamily: Platform.select({
			ios: 'System',
			android: 'Roboto',
			default: 'System',
		}),
		brandFont: 'Cooper BT', // Giftyy brand font
		
		sizes: {
			xs: normalizeFont(10),
			sm: normalizeFont(12),
			base: normalizeFont(14),
			md: normalizeFont(16),
			lg: normalizeFont(18),
			xl: normalizeFont(20),
			'2xl': normalizeFont(24),
			'3xl': normalizeFont(28),
			'4xl': normalizeFont(32),
		},
		
		weights: {
			normal: '400' as const,
			medium: '500' as const,
			semibold: '600' as const,
			bold: '700' as const,
			extrabold: '800' as const,
			black: '900' as const,
		},
	},
	
	// Spacing System
	spacing: {
		xs: scale(4),
		sm: scale(8),
		md: scale(12),
		lg: scale(16),
		xl: scale(20),
		'2xl': scale(24),
		'3xl': scale(32),
		'4xl': scale(40),
		'5xl': scale(48),
	},
	
	// Border Radius
	radius: {
		sm: scale(8),
		md: scale(12),
		lg: scale(16),
		xl: scale(20),
		'2xl': scale(24),
		full: 9999,
	},
	
	// Shadows (Elevation)
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
			shadowOpacity: 0.1,
			shadowRadius: 8,
			elevation: 4,
		},
		lg: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.15,
			shadowRadius: 12,
			elevation: 8,
		},
		xl: {
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.2,
			shadowRadius: 16,
			elevation: 12,
		},
	},
	
	// Layout
	layout: {
		screenWidth: SCREEN_WIDTH,
		screenHeight: SCREEN_HEIGHT,
		cardWidth2Col: (SCREEN_WIDTH - 48) / 2, // 2 columns with padding and gap
		cardWidth3Col: (SCREEN_WIDTH - 52) / 3, // 3 columns with padding and gap
		maxContentWidth: 1200,
		headerHeight: 60,
	},
	
	// Animation Durations (in milliseconds)
	animations: {
		fast: 150,
		normal: 250,
		slow: 400,
		verySlow: 600,
	},
	
	// Gradients
	gradients: {
		primary: ['#f75507', '#ff6d2a'],
		warm: ['#fff5f0', '#ffe5e5'],
		celebration: ['#ffb799', '#ff6d2a', '#f75507'],
	},
} as const;

export type GiftyyTheme = typeof GIFTYY_THEME;

