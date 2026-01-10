import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';

type ShippingBreakdown = {
	total: number;
	breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number }>;
};

type TaxBreakdown = {
	items: number;
	card: number;
	total: number;
};

type Props = {
	title?: string;
	itemsSubtotal: number;
	cardAddOn: number;
	shippingBreakdown: ShippingBreakdown;
	taxBreakdown: TaxBreakdown;
	total: number;
	taxRate: number;
	formatCurrency: (amount: number) => string;
	isCalculatingShipping?: boolean;
};

export function EstimatedTotalsCard({
	title = 'Estimated totals',
	itemsSubtotal,
	cardAddOn,
	shippingBreakdown,
	taxBreakdown,
	total,
	taxRate,
	formatCurrency,
	isCalculatingShipping = false,
}: Props) {
	const shipping = shippingBreakdown.total;

	return (
		<View style={styles.summaryCard}>
			<Text style={styles.summaryTitle}>{title}</Text>
			<View style={styles.summaryRowBetween}>
				<Text style={styles.summaryLabel}>Items subtotal</Text>
				<Text style={styles.summaryValue}>{formatCurrency(itemsSubtotal)}</Text>
			</View>
			<View style={styles.summaryRowBetween}>
				<Text style={styles.summaryLabel}>Card price</Text>
				<Text style={styles.summaryValue}>{formatCurrency(cardAddOn)}</Text>
			</View>

			<View style={{ marginTop: GIFTYY_THEME.spacing.sm, paddingTop: GIFTYY_THEME.spacing.sm, borderTopWidth: 1, borderTopColor: GIFTYY_THEME.colors.gray100 }}>
				<View style={[styles.summaryRowBetween, { marginBottom: 6 }]}>
					<Text style={[styles.summaryLabel, { fontWeight: GIFTYY_THEME.typography.weights.extrabold }]}>Shipping breakdown</Text>
					{isCalculatingShipping ? (
						<Text style={{ fontSize: GIFTYY_THEME.typography.sizes.sm, color: GIFTYY_THEME.colors.gray500 }}>Calculating...</Text>
					) : (
						<Text style={[styles.summaryValue, { fontSize: GIFTYY_THEME.typography.sizes.sm, color: GIFTYY_THEME.colors.gray500 }]}>Estimated</Text>
					)}
				</View>
				{shippingBreakdown.breakdown.map((vendor, idx) => (
					<View key={vendor.vendorId || idx} style={[styles.summaryRowBetween, { marginTop: GIFTYY_THEME.spacing.xs }]}>
						<Text style={[styles.summaryLabel, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>
							{vendor.vendorName} ({vendor.itemCount} item{vendor.itemCount !== 1 ? 's' : ''})
						</Text>
						<Text style={[styles.summaryValue, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>
							{vendor.shipping === 0 ? 'Free' : formatCurrency(vendor.shipping)}
						</Text>
					</View>
				))}
				<View style={[styles.summaryRowBetween, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: GIFTYY_THEME.colors.gray200 }]}>
					<Text style={styles.summaryLabel}>Total shipping</Text>
					<Text style={styles.summaryValue}>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</Text>
				</View>
			</View>

			<View style={{ marginTop: GIFTYY_THEME.spacing.sm, paddingTop: GIFTYY_THEME.spacing.sm, borderTopWidth: 1, borderTopColor: GIFTYY_THEME.colors.gray100 }}>
				<Text style={[styles.summaryLabel, { fontWeight: GIFTYY_THEME.typography.weights.extrabold, marginBottom: 6 }]}>
					Tax breakdown ({(taxRate * 100).toFixed(1)}%)
				</Text>
				<View style={[styles.summaryRowBetween, { marginTop: GIFTYY_THEME.spacing.xs }]}>
					<Text style={[styles.summaryLabel, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>Tax on items</Text>
					<Text style={[styles.summaryValue, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>{formatCurrency(taxBreakdown.items)}</Text>
				</View>
				{cardAddOn > 0 && (
					<View style={[styles.summaryRowBetween, { marginTop: GIFTYY_THEME.spacing.xs }]}>
						<Text style={[styles.summaryLabel, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>Tax on card</Text>
						<Text style={[styles.summaryValue, { fontSize: GIFTYY_THEME.typography.sizes.sm }]}>{formatCurrency(taxBreakdown.card)}</Text>
					</View>
				)}
				<View style={[styles.summaryRowBetween, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: GIFTYY_THEME.colors.gray200 }]}>
					<Text style={styles.summaryLabel}>Total tax</Text>
					<Text style={styles.summaryValue}>{formatCurrency(taxBreakdown.total)}</Text>
				</View>
			</View>

			<View style={[styles.summaryRowBetween, { marginTop: GIFTYY_THEME.spacing.sm, paddingTop: GIFTYY_THEME.spacing.sm, borderTopWidth: 2, borderTopColor: GIFTYY_THEME.colors.gray200 }]}>
				<Text style={[styles.summaryLabel, { fontWeight: GIFTYY_THEME.typography.weights.black }]}>Order total</Text>
				<Text style={[styles.summaryValue, { fontWeight: GIFTYY_THEME.typography.weights.black, fontSize: GIFTYY_THEME.typography.sizes.lg }]}>{formatCurrency(total)}</Text>
			</View>
			<Text style={{ color: GIFTYY_THEME.colors.gray400, marginTop: 6, fontSize: GIFTYY_THEME.typography.sizes.sm }}>
				Tax and shipping are estimated. Final amounts calculated at payment.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	summaryCard: {
		backgroundColor: GIFTYY_THEME.colors.white,
		padding: GIFTYY_THEME.spacing.md,
		borderRadius: GIFTYY_THEME.radius.lg,
		borderWidth: 1,
		borderColor: GIFTYY_THEME.colors.gray200,
		gap: GIFTYY_THEME.spacing.sm,
		...GIFTYY_THEME.shadows.sm,
	},
	summaryTitle: {
		fontSize: GIFTYY_THEME.typography.sizes.lg,
		fontWeight: GIFTYY_THEME.typography.weights.black,
		color: GIFTYY_THEME.colors.gray900,
	},
	summaryRowBetween: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: {
		color: GIFTYY_THEME.colors.gray600,
		fontWeight: GIFTYY_THEME.typography.weights.semibold,
	},
	summaryValue: {
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
	},
});

