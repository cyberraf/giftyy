import React, { useEffect } from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import BrandButton from '@/components/BrandButton';
import { BRAND_COLOR } from '@/constants/theme';

type Props = {
	visible: boolean;
	onClose: () => void;
	onViewCart: () => void;
	title?: string;
	imageUri?: string;
	autoDismissMs?: number;
};

export default function AddedToCartDialog({
	visible,
	onClose,
	onViewCart,
	title = 'Added to cart',
	imageUri,
	autoDismissMs = 1600,
}: Props) {
	useEffect(() => {
		if (!visible) return;
		const t = setTimeout(onClose, autoDismissMs);
		return () => clearTimeout(t);
	}, [visible, autoDismissMs, onClose]);

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={styles.card}>
					<View style={styles.row}>
						<View style={styles.iconCircle}>
							<IconSymbol name="gift.fill" size={18} color={BRAND_COLOR} />
						</View>
						<Text style={styles.title}>{title}</Text>
					</View>
					<View style={[styles.row, { alignItems: 'center', marginTop: 8 }]}>
						{imageUri ? (
							<Image source={{ uri: imageUri }} style={styles.thumb} />
						) : (
							<View style={[styles.thumb, { backgroundColor: '#f3f4f6' }]} />
						)}
						<Text numberOfLines={2} style={styles.subtitle}>Item added successfully. You can continue shopping or view your cart.</Text>
					</View>
					<View style={{ height: 10 }} />
					<View style={{ flexDirection: 'row', gap: 10 }}>
						<BrandButton title="View cart" onPress={onViewCart} style={{ flex: 1 }} />
						<Pressable onPress={onClose} style={styles.secondaryBtn}>
							<Text style={styles.secondaryBtnText}>Continue</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.25)',
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	card: {
		backgroundColor: 'white',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 16,
		width: '100%',
		gap: 6,
	},
	row: { flexDirection: 'row', gap: 10 },
	iconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#FFF2EA',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: { fontSize: 16, fontWeight: '900' },
	subtitle: { flex: 1, color: '#6b7280', fontWeight: '600' },
	thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#eee' },
	secondaryBtn: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryBtnText: { fontWeight: '800', color: '#111827' },
});


