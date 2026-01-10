/**
 * Animation Utilities and Presets for Giftyy Marketplace
 * Using React Native Reanimated for smooth, performant animations
 */

import { Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation configuration presets (to be used with react-native-reanimated)
export const ANIMATION_PRESETS = {
	// Fade In Animations
	fadeIn: {
		from: { opacity: 0 },
		to: { opacity: 1 },
		duration: 250,
	},
	
	fadeInUp: {
		from: { opacity: 0, translateY: 20 },
		to: { opacity: 1, translateY: 0 },
		duration: 300,
	},
	
	fadeInDown: {
		from: { opacity: 0, translateY: -20 },
		to: { opacity: 1, translateY: 0 },
		duration: 300,
	},
	
	// Scale Animations
	scaleIn: {
		from: { scale: 0.9, opacity: 0 },
		to: { scale: 1, opacity: 1 },
		duration: 250,
	},
	
	scaleBounce: {
		from: { scale: 0 },
		to: { scale: 1 },
		duration: 400,
	},
	
	// Slide Animations
	slideInRight: {
		from: { translateX: 100, opacity: 0 },
		to: { translateX: 0, opacity: 1 },
		duration: 300,
	},
	
	slideInLeft: {
		from: { translateX: -100, opacity: 0 },
		to: { translateX: 0, opacity: 1 },
		duration: 300,
	},
	
	// Stagger Delay (for grid animations)
	getStagger: (index: number, delay = 50) => ({
		delay: index * delay,
		duration: 300,
	}),
	
	// Micro-interactions
	press: {
		active: { scale: 0.95 },
		inactive: { scale: 1 },
		duration: 100,
	},
	
	bounce: {
		from: { scale: 1 },
		to: { scale: 1.1 },
		duration: 150,
	},
	
	// Heart Animation
	heartBeat: {
		from: { scale: 1 },
		to: { scale: 1.2 },
		duration: 200,
	},
	
	// Modal Animations
	modalSlideUp: {
		from: { translateY: SCREEN_HEIGHT, opacity: 0 },
		to: { translateY: 0, opacity: 1 },
		duration: 300,
	},
	
	// Background Shapes (Floating)
	floating: {
		from: { translateY: 0 },
		to: { translateY: -10 },
		duration: 3000,
	},
} as const;

export const EASING_PRESETS = {
	ease: { type: 'ease' as const },
	easeIn: { type: 'easeIn' as const },
	easeOut: { type: 'easeOut' as const },
	easeInOut: { type: 'easeInOut' as const },
	spring: { damping: 15, stiffness: 150 },
} as const;
