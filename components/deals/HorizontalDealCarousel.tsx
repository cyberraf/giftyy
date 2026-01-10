/**
 * Horizontal Deal Carousel Component
 * Smooth sliding carousel for curated deal collections
 */

import { DealGridItem } from './DealGridItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import type { Product } from '@/contexts/ProductsContext';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.65;

type Props = {
	title: string;
	icon: string;
	products: (Product & { imageUrl?: string; vendorName?: string })[];
	onProductPress: (id: string) => void;
};

export function HorizontalDealCarousel({ title, icon, products, onProductPress }: Props) {
	if (products.length === 0) return null;
	
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<IconSymbol name={icon as any} size={20} color={GIFTYY_THEME.colors.primary} />
				<Text style={styles.title}>{title}</Text>
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH + 16}
				snapToAlignment="start"
			>
				{products.map((product) => (
					<View key={product.id} style={[styles.cardContainer, { width: CARD_WIDTH }]}>
						<DealGridItem
							product={product}
							onPress={() => onProductPress(product.id)}
						/>
					</View>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
		marginLeft: 8,
	},
	scrollContent: {
		paddingRight: GIFTYY_THEME.spacing.lg,
	},
	cardContainer: {
		marginRight: 16,
	},
});

