/**
 * Bottom bar dimensions and spacing constants
 * Used to calculate proper padding for content to avoid being hidden by the bottom bar
 * Note: The bottom bar now extends to the bottom of the screen, so padding should use:
 * BOTTOM_BAR_HEIGHT + safeAreaInsets.bottom
 */
export const BOTTOM_BAR_HEIGHT = 68; // Base height of the bottom bar content area
export const BOTTOM_BAR_BOTTOM_OFFSET = 0; // No longer used - bar extends to bottom
export const BOTTOM_BAR_TOTAL_SPACE = BOTTOM_BAR_HEIGHT; // Base height (add safeAreaInsets.bottom in components)

