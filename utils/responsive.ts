import { Dimensions, PixelRatio } from 'react-native';

// Base guideline sizes are based on standard ~5.5" device
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Scale horizontally with device width
 */
export const scale = (size: number) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * Scale vertically with device height
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Moderated scaling to avoid extremes
 */
export const moderateScale = (size: number, factor = 0.5) =>
	size + (scale(size) - size) * factor;

/**
 * Normalize font sizes using PixelRatio to keep readability
 */
export const normalizeFont = (size: number, factor = 0.5) => {
	const newSize = moderateScale(size, factor);
	return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const responsive = {
	screenWidth: SCREEN_WIDTH,
	screenHeight: SCREEN_HEIGHT,
	scale,
	verticalScale,
	moderateScale,
	normalizeFont,
};

