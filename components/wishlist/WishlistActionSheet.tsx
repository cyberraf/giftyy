/**
 * Wishlist Action Sheet Component
 * Slide-up action sheet for long-press actions
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
	visible: boolean;
	onClose: () => void;
	onAction: (action: 'cart' | 'share' | 'remove') => void;
	productName?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WishlistActionSheet({ visible, onClose, onAction, productName }: Props) {
	const { bottom } = useSafeAreaInsets();
	const scale = useSharedValue(0.95);
	
	React.useEffect(() => {
		if (visible) {
			scale.value = withSpring(1, { damping: 20, stiffness: 300 });
		} else {
			scale.value = 0.95;
		}
	}, [visible]);
	
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	
	const actions = [
		{
			id: 'cart' as const,
			label: 'Add to Cart',
			icon: 'cart.fill',
			color: GIFTYY_THEME.colors.primary,
		},
		{
			id: 'share' as const,
			label: 'Share',
			icon: 'square.and.arrow.up',
			color: GIFTYY_THEME.colors.gray700,
		},
		{
			id: 'remove' as const,
			label: 'Remove from Wishlist',
			icon: 'trash',
			color: GIFTYY_THEME.colors.error,
		},
	];
	
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Animated.View
					style={[
						styles.actionSheet,
						{ paddingBottom: bottom + 20 },
						animatedStyle,
					]}
					entering={FadeInDown.duration(300)}
					onStartShouldSetResponder={() => true}
				>
					{/* Handle */}
					<View style={styles.handle} />
					
					{/* Product Name */}
					{productName && (
						<Text style={styles.productName} numberOfLines={2}>
							{productName}
						</Text>
					)}
					
					{/* Actions */}
					<View style={styles.actionsContainer}>
						{actions.map((action, index) => (
							<AnimatedPressable
								key={action.id}
								style={styles.actionButton}
								onPress={() => {
									onAction(action.id);
								}}
								entering={FadeInDown.duration(200).delay(50 * index)}
							>
								<View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
									<IconSymbol 
										name={action.icon as any} 
										size={24} 
										color={action.color} 
									/>
								</View>
								<Text style={[styles.actionLabel, { color: action.color }]}>
									{action.label}
								</Text>
							</AnimatedPressable>
						))}
					</View>
					
					{/* Cancel Button */}
					<Pressable style={styles.cancelButton} onPress={onClose}>
						<Text style={styles.cancelText}>Cancel</Text>
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: GIFTYY_THEME.colors.overlay,
		justifyContent: 'flex-end',
	},
	actionSheet: {
		backgroundColor: GIFTYY_THEME.colors.white,
		borderTopLeftRadius: GIFTYY_THEME.radius['3xl'],
		borderTopRightRadius: GIFTYY_THEME.radius['3xl'],
		paddingHorizontal: GIFTYY_THEME.spacing.xl,
		paddingTop: GIFTYY_THEME.spacing.lg,
		...GIFTYY_THEME.shadows.xl,
	},
	handle: {
		width: 40,
		height: 4,
		backgroundColor: GIFTYY_THEME.colors.gray300,
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: GIFTYY_THEME.spacing.lg,
	},
	productName: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray900,
		textAlign: 'center',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	actionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: GIFTYY_THEME.spacing.xl,
	},
	actionButton: {
		alignItems: 'center',
		flex: 1,
	},
	actionIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	actionLabel: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
		textAlign: 'center',
	},
	cancelButton: {
		backgroundColor: GIFTYY_THEME.colors.gray100,
		paddingVertical: 16,
		borderRadius: GIFTYY_THEME.radius.xl,
		alignItems: 'center',
		marginBottom: GIFTYY_THEME.spacing.md,
	},
	cancelText: {
		fontSize: GIFTYY_THEME.typography.sizes.base,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
		color: GIFTYY_THEME.colors.gray700,
	},
});

