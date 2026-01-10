/**
 * Accordion Section Component
 * Expandable sections for Details, Shipping, Reviews, Policies
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
	Layout,
} from 'react-native-reanimated';

type AccordionItem = {
	id: string;
	title: string;
	icon?: string;
	content: string | React.ReactNode;
};

type AccordionSectionProps = {
	items: AccordionItem[];
	defaultOpenId?: string;
};

export function AccordionSection({ items, defaultOpenId }: AccordionSectionProps) {
	const [openId, setOpenId] = useState<string | undefined>(defaultOpenId);

	const toggleItem = (id: string) => {
		setOpenId(openId === id ? undefined : id);
	};

	return (
		<View style={styles.container}>
			{items.map((item, index) => {
				const isOpen = openId === item.id;
				const rotation = useSharedValue(isOpen ? 180 : 0);

				React.useEffect(() => {
					rotation.value = withTiming(isOpen ? 180 : 0, {
						duration: 300,
					});
				}, [isOpen]);

				const arrowAnimatedStyle = useAnimatedStyle(() => ({
					transform: [{ rotate: `${rotation.value}deg` }],
				}));

				const contentHeight = useSharedValue(isOpen ? 1 : 0);

				React.useEffect(() => {
					contentHeight.value = withTiming(isOpen ? 1 : 0, {
						duration: 300,
					});
				}, [isOpen]);

				const contentAnimatedStyle = useAnimatedStyle(() => ({
					opacity: contentHeight.value,
					maxHeight: contentHeight.value === 1 ? 1000 : 0,
					overflow: 'hidden',
				}));

				return (
					<View key={item.id} style={[styles.item, index === 0 && styles.firstItem]}>
						<Pressable
							onPress={() => toggleItem(item.id)}
							style={styles.header}
						>
							<View style={styles.headerLeft}>
								{item.icon && (
									<IconSymbol
										name={item.icon as any}
										size={20}
										color={GIFTYY_THEME.colors.primary}
										style={styles.icon}
									/>
								)}
								<Text style={styles.title}>{item.title}</Text>
							</View>
							<Animated.View style={arrowAnimatedStyle}>
								<IconSymbol
									name="chevron.down"
									size={20}
									color={GIFTYY_THEME.colors.gray600}
								/>
							</Animated.View>
						</Pressable>

						<Animated.View style={contentAnimatedStyle} layout={Layout}>
							<View style={styles.content}>
								{typeof item.content === 'string' ? (
									<Text style={styles.contentText}>{item.content}</Text>
								) : (
									item.content
								)}
							</View>
						</Animated.View>
					</View>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: GIFTYY_THEME.colors.white,
	},
	item: {
		borderBottomWidth: 1,
		borderBottomColor: GIFTYY_THEME.colors.gray200,
	},
	firstItem: {
		borderTopWidth: 1,
		borderTopColor: GIFTYY_THEME.colors.gray200,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingVertical: GIFTYY_THEME.spacing.lg,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	icon: {
		marginRight: GIFTYY_THEME.spacing.md,
	},
	title: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: GIFTYY_THEME.colors.gray900,
	},
	content: {
		paddingHorizontal: GIFTYY_THEME.spacing.lg,
		paddingBottom: GIFTYY_THEME.spacing.lg,
	},
	contentText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		lineHeight: 22,
		color: GIFTYY_THEME.colors.gray600,
	},
});

