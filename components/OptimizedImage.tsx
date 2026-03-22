import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { Image, type ImageProps } from 'expo-image';
import React from 'react';
import { StyleSheet } from 'react-native';

/**
 * OptimizedImage — wraps expo-image with sensible defaults:
 * - Memory + disk caching
 * - Fade-in transition
 * - Placeholder color while loading
 * - Recycling for FlatList performance
 *
 * Drop-in replacement for RN's Image in product cards, grids, etc.
 */

type OptimizedImageProps = Omit<ImageProps, 'cachePolicy'> & {
	/** Placeholder background color while loading (default: gray100) */
	placeholderColor?: string;
	/** Transition duration in ms (default: 200) */
	fadeDuration?: number;
};

export function OptimizedImage({
	placeholderColor = GIFTYY_THEME.colors.gray100,
	fadeDuration = 200,
	style,
	...props
}: OptimizedImageProps) {
	return (
		<Image
			{...props}
			style={[styles.base, style]}
			cachePolicy="memory-disk"
			transition={fadeDuration}
			placeholder={{ uri: undefined }}
			placeholderContentFit="cover"
			recyclingKey={typeof props.source === 'string' ? props.source : undefined}
			{...(placeholderColor ? { backgroundColor: placeholderColor } : {})}
		/>
	);
}

const styles = StyleSheet.create({
	base: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
	},
});
