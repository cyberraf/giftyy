import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type ShippingBreakdown = {
	total: number;
	breakdown: Array<{ vendorId: string; vendorName: string; subtotal: number; shipping: number; itemCount: number; doesNotShip?: boolean }>;
};

type TaxBreakdown = {
	items: number;
	card: number;
	total: number;
};

type Props = {
	itemsSubtotal: number;
	cardAddOn: number;
	shippingBreakdown: ShippingBreakdown;
	taxBreakdown: TaxBreakdown;
	total: number;
	taxRate: number;
	formatCurrency: (amount: number) => string;
	isCalculatingShipping?: boolean;
};

type SummaryRowProps = {
	label: string;
	value: string;
	emphasize?: boolean;
};

function SummaryRow({ label, value, emphasize = false }: SummaryRowProps) {
	return (
		<View style={styles.summaryRowBetween}>
			<Text style={[styles.summaryLabel, emphasize && styles.emphasizedLabel]}>{label}</Text>
			<Text style={[styles.summaryValue, emphasize && styles.emphasizedValue]}>{value}</Text>
		</View>
	);
}

export function EstimatedTotalsCard({
	itemsSubtotal,
	cardAddOn,
	shippingBreakdown,
	taxBreakdown,
	total,
	taxRate,
	formatCurrency,
	isCalculatingShipping = false,
}: Props) {
	const { t } = useTranslation();

	return (
		<View style={styles.summaryCard}>
			<Text style={styles.summaryTitle}>{t('checkout.recipient.estimated_totals')}</Text>
			<SummaryRow label={t('checkout.recipient.items_subtotal')} value={formatCurrency(itemsSubtotal)} />
			{cardAddOn > 0 && <SummaryRow label={t('checkout.recipient.card_price')} value={formatCurrency(cardAddOn)} />}

			<View style={styles.divider} />

			<View style={styles.summaryRowBetween}>
				<Text style={styles.summaryLabel}>{t('checkout.recipient.shipping_breakdown')}</Text>
				{isCalculatingShipping && <ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />}
			</View>

			{shippingBreakdown.breakdown.map((vendor, index) => (
				<View key={vendor.vendorId || index} style={styles.vendorShippingRow}>
					<Text style={styles.vendorNameText}>
						{vendor.vendorName} ({vendor.itemCount} {t('app.items', { count: vendor.itemCount })})
					</Text>
					<Text style={styles.vendorShippingValue}>
						{vendor.doesNotShip
							? t('checkout.recipient.shipping_not_supported')
							: (vendor.shipping === 0 ? t('checkout.common.free') : formatCurrency(vendor.shipping))}
					</Text>
				</View>
			))}

			<SummaryRow label={t('checkout.recipient.total_shipping')} value={shippingBreakdown.total === 0 ? t('checkout.common.free') : formatCurrency(shippingBreakdown.total)} />

			<View style={styles.divider} />

			<Text style={styles.summaryLabel}>
				{t('checkout.recipient.tax_breakdown', { percent: (taxRate * 100).toFixed(1) })}
			</Text>
			<SummaryRow label={t('checkout.recipient.tax_items')} value={formatCurrency(taxBreakdown.items)} />
			{cardAddOn > 0 && <SummaryRow label={t('checkout.recipient.tax_card')} value={formatCurrency(taxBreakdown.card)} />}
			<SummaryRow label={t('checkout.recipient.total_tax')} value={formatCurrency(taxBreakdown.total)} />

			<View style={styles.divider} />

			<SummaryRow label={t('checkout.recipient.order_total')} value={formatCurrency(total)} emphasize />
			<Text style={styles.finePrint}>{t('checkout.recipient.disclaimer')}</Text>
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
	emphasizedLabel: {
		fontWeight: GIFTYY_THEME.typography.weights.black,
		color: GIFTYY_THEME.colors.gray900,
	},
	emphasizedValue: {
		color: GIFTYY_THEME.colors.primary,
		fontSize: GIFTYY_THEME.typography.sizes.lg,
	},
	divider: {
		height: 1,
		backgroundColor: GIFTYY_THEME.colors.gray100,
		marginVertical: GIFTYY_THEME.spacing.sm,
	},
	vendorShippingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	vendorNameText: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray500,
	},
	vendorShippingValue: {
		fontSize: GIFTYY_THEME.typography.sizes.sm,
		color: GIFTYY_THEME.colors.gray900,
		fontWeight: GIFTYY_THEME.typography.weights.bold,
	},
	finePrint: {
		fontSize: GIFTYY_THEME.typography.sizes.xs,
		color: GIFTYY_THEME.colors.gray400,
		marginTop: 8,
		fontStyle: 'italic',
	},
});

