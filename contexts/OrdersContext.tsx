import { type Recipient } from '@/lib/CheckoutContext';
import { logProductAnalyticsEvent } from '@/lib/product-analytics';
import { parsePrice } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { type CartItem } from './CartContext';
import { useVideoMessages } from './VideoMessagesContext';

export type OrderStatus = 'awaiting_qr_assignment' | 'qr_assigned' | 'processing' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type OrderItem = {
	id: string;
	productId: string;
	productName: string;
	productImageUrl?: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
};

export type Order = {
	id: string;
	userId: string;
	orderCode: string;
	status: OrderStatus;
	recipient: Recipient;
	cardType?: 'Standard' | 'Premium' | 'Luxury' | 'Giftyy Card';
	cardPrice: number;
	notifyRecipient: boolean;
	items: OrderItem[];
	itemsSubtotal: number;
	shippingCost: number;
	taxAmount: number;
	totalAmount: number;
	paymentLast4?: string;
	paymentBrand?: string;
	sharedMemoryId?: string;
	trackingNumber?: string;
	estimatedDeliveryDate?: string;
	deliveredAt?: string;
	createdAt: string;
	updatedAt: string;
};

type OrdersContextValue = {
	orders: Order[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	createOrder: (
		cartItems: CartItem[],
		recipient: Recipient,
		cardType: string,
		cardPrice: number,
		notifyRecipient: boolean,
		itemsSubtotal: number,
		shippingCost: number,
		taxAmount: number,
		totalAmount: number,
		paymentLast4?: string,
		paymentBrand?: string,
		videoMessageId?: string,
		sharedMemoryId?: string,
		vendorId?: string
	) => Promise<{ order: Order | null; error: Error | null }>;
	refreshOrders: () => Promise<void>;
	loadMoreOrders: () => Promise<void>;
	getOrderById: (id: string) => Order | undefined;
	getOrderByCode: (code: string) => Order | undefined;
};

const ORDERS_PER_PAGE = 20;

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to Order (camelCase)
function dbRowToOrder(row: any, items: any[]): Order {
	return {
		id: row.id,
		userId: row.user_id,
		orderCode: row.order_code,
		status: row.status as OrderStatus,
		recipient: {
			firstName: row.recipient_first_name,
			lastName: row.recipient_last_name || undefined,
			street: row.recipient_street,
			apartment: row.recipient_apartment || undefined,
			city: row.recipient_city,
			state: row.recipient_state || undefined,
			country: row.recipient_country,
			zip: row.recipient_zip,
			phone: row.recipient_phone || undefined,
			email: row.recipient_email || undefined,
		},
		cardType: row.card_type || undefined,
		cardPrice: parseFloat(row.card_price || '0'),
		notifyRecipient: row.notify_recipient || false,
		items: items.map((item) => ({
			id: item.id,
			productId: item.product_id,
			productName: item.product_name,
			productImageUrl: item.product_image_url || undefined,
			quantity: item.quantity,
			unitPrice: parseFloat(item.unit_price || '0'),
			totalPrice: parseFloat(item.total_price || '0'),
		})),
		itemsSubtotal: parseFloat(row.items_subtotal || '0'),
		shippingCost: parseFloat(row.shipping_cost || '0'),
		taxAmount: parseFloat(row.tax_amount || '0'),
		totalAmount: parseFloat(row.total_amount || '0'),
		paymentLast4: row.payment_last4 || undefined,
		paymentBrand: row.payment_brand || undefined,
		sharedMemoryId: row.shared_memory_id || undefined,
		trackingNumber: row.tracking_number || undefined,
		estimatedDeliveryDate: row.estimated_delivery_date || undefined,
		deliveredAt: row.delivered_at || undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

// Helper function to generate order code
function generateOrderCode(): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8).toUpperCase();
	return `GIF-${random}`;
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [currentOffset, setCurrentOffset] = useState(0);
	const { user } = useAuth();
	const { updateVideoMessageOrderId } = useVideoMessages();

	// Shared helper: fetch a page of orders with their items
	const fetchOrdersPage = useCallback(async (userId: string, limit: number, offset: number): Promise<Order[]> => {
		const { data: ordersData, error: ordersError } = await supabase
			.from('orders')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (ordersError) {
			console.error('Error fetching orders:', ordersError);
			return [];
		}

		if (!ordersData || ordersData.length === 0) return [];

		// Fetch order items for this page of orders
		const orderIds = ordersData.map((o) => o.id);
		const { data: itemsData, error: itemsError } = await supabase
			.from('order_items')
			.select('*')
			.in('order_id', orderIds);

		if (itemsError) {
			console.error('Error fetching order items:', itemsError);
			return [];
		}

		// Group items by order_id
		const itemsByOrderId = new Map<string, any[]>();
		(itemsData || []).forEach((item) => {
			const orderId = item.order_id;
			if (!itemsByOrderId.has(orderId)) {
				itemsByOrderId.set(orderId, []);
			}
			itemsByOrderId.get(orderId)!.push(item);
		});

		return ordersData.map((order) =>
			dbRowToOrder(order, itemsByOrderId.get(order.id) || [])
		);
	}, []);

	// Fetch first page of orders (replaces existing list)
	const refreshOrders = useCallback(async () => {
		if (!user) {
			setOrders([]);
			setLoading(false);
			setHasMore(false);
			return;
		}

		try {
			setLoading(true);
			const fetched = await fetchOrdersPage(user.id, ORDERS_PER_PAGE, 0);
			setOrders(fetched);
			setCurrentOffset(fetched.length);
			setHasMore(fetched.length === ORDERS_PER_PAGE);
		} catch (err) {
			console.error('Unexpected error fetching orders:', err);
		} finally {
			setLoading(false);
		}
	}, [user, fetchOrdersPage]);

	// Fetch orders when user changes
	useEffect(() => {
		refreshOrders();
	}, [refreshOrders]);

	const createOrder = useCallback(
		async (
			cartItems: CartItem[],
			recipient: Recipient,
			cardType: string,
			cardPrice: number,
			notifyRecipient: boolean,
			itemsSubtotal: number,
			shippingCost: number,
			taxAmount: number,
			totalAmount: number,
			paymentLast4?: string,
			paymentBrand?: string,
			videoMessageId?: string,
			sharedMemoryId?: string,
			vendorId?: string
		): Promise<{ order: Order | null; error: Error | null }> => {
			if (!user) {
				return { order: null, error: new Error('User not authenticated') };
			}

			try {
				// Preflight validation: ensure every cart item points to an existing DB product.
				// This avoids FK failures on order_items.product_id.
				const resolvedProductIds = cartItems.map((item) => (item as any).productId || item.id);
				const uniqueProductIds = Array.from(new Set(resolvedProductIds.filter(Boolean)));

				if (uniqueProductIds.length === 0) {
					return { order: null, error: new Error('Your cart is empty or contains invalid items.') };
				}

				const { data: existingProducts, error: productsError } = await supabase
					.from('products')
					.select('id')
					.in('id', uniqueProductIds);

				if (productsError) {
					console.error('Error validating products before order:', productsError);
					return { order: null, error: new Error('Unable to validate cart items. Please try again.') };
				}

				const existingIds = new Set((existingProducts || []).map((p) => p.id));
				const missingIds = uniqueProductIds.filter((id) => !existingIds.has(id));

				if (missingIds.length > 0) {
					console.warn('Order blocked due to missing products:', missingIds);
					return {
						order: null,
						error: new Error(
							'Some items in your cart are no longer available. Please remove unavailable items and try again.'
						),
					};
				}

				const orderCode = generateOrderCode();

				// Create order
				const { data: orderData, error: orderError } = await supabase
					.from('orders')
					.insert({
						user_id: user.id,
						order_code: orderCode,
						status: 'awaiting_qr_assignment',
						recipient_first_name: recipient.firstName,
						recipient_last_name: recipient.lastName || null,
						recipient_street: recipient.street,
						recipient_apartment: recipient.apartment || null,
						recipient_city: recipient.city,
						recipient_state: recipient.state || null,
						recipient_country: recipient.country,
						recipient_zip: recipient.zip,
						recipient_phone: recipient.phone || null,
						recipient_email: recipient.email || null,
						card_type: cardType || null,
						card_price: cardPrice,
						notify_recipient: notifyRecipient,
						vendor_id: vendorId || null,
						items_subtotal: itemsSubtotal,
						shipping_cost: shippingCost,
						tax_amount: taxAmount,
						total_amount: totalAmount,
						payment_last4: paymentLast4 || null,
						payment_brand: paymentBrand || null,
						shared_memory_id: sharedMemoryId || null,
					})
					.select()
					.single();

				if (orderError) {
					console.error('Error creating order:', orderError);
					return { order: null, error: new Error(orderError.message) };
				}

				// Create order items
				const orderItems = cartItems.map((item) => {
					const unitPrice = parsePrice(item.price);
					const resolvedProductId = (item as any).productId || item.id;
					return {
						order_id: orderData.id,
						// order_items.product_id references products.id
						product_id: resolvedProductId,
						product_name: item.name,
						product_image_url: item.image || null,
						quantity: item.quantity,
						unit_price: unitPrice,
						total_price: unitPrice * item.quantity,
					};
				});

				const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

				if (itemsError) {
					console.error('Error creating order items:', itemsError);
					// Try to delete the order if items creation fails
					await supabase.from('orders').delete().eq('id', orderData.id);
					return { order: null, error: new Error(itemsError.message) };
				}

				// Link video message to order if provided
				if (videoMessageId) {
					const { error: videoError } = await updateVideoMessageOrderId(videoMessageId, orderData.id);
					if (videoError) {
						console.error('Error linking video message to order:', videoError);
						// Don't fail the order creation if video linking fails
					}
				}

				// Reduce stock counts for purchased products via RPC (atomic decrement)
				try {
					await Promise.all(
						cartItems.map(async (item) => {
							const resolvedProductId = (item as any).productId || item.id;
							const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
								p_product_id: resolvedProductId,
								p_quantity: item.quantity,
							});

							if (rpcError) {
								console.warn('Failed to decrement stock for product', resolvedProductId, rpcError);
							}
						})
					);
				} catch (stockError) {
					console.warn('Unexpected error updating product stock levels:', stockError);
				}

				// Log purchase analytics events
				try {
					await Promise.all(
						cartItems.map((item) => {
							const resolvedProductId = (item as any).productId || item.id;
							return (
							logProductAnalyticsEvent({
								productId: resolvedProductId,
								eventType: 'purchase',
								metadata: {
									orderId: orderData.id,
									quantity: item.quantity,
								},
							})
							);
						})
					);
				} catch (analyticsError) {
					console.warn('Failed to log purchase analytics events', analyticsError);
				}

				// Fetch the complete order with items
				const { data: completeOrderData, error: fetchError } = await supabase
					.from('orders')
					.select('*')
					.eq('id', orderData.id)
					.single();

				if (fetchError) {
					return { order: null, error: new Error(fetchError.message) };
				}

				const { data: itemsData } = await supabase
					.from('order_items')
					.select('*')
					.eq('order_id', orderData.id);

				const order = dbRowToOrder(completeOrderData, itemsData || []);

				// Refresh the list
				await refreshOrders();

				// Recipient notifications (email + in-app + push) are triggered server-side
				// by the tr_notify_recipient_on_new_order Postgres trigger on orders INSERT.

				// Send confirmation email to buyer
				if (user.email) {
					try {
						console.log('[Order] Sending confirmation email to buyer:', user.email);
						// Format address for email
						const addressParts = [
							recipient.street,
							recipient.apartment,
							recipient.city,
							recipient.state,
							recipient.zip,
							recipient.country
						].filter(Boolean);
						const formattedAddress = addressParts.join(', ');

						await supabase.functions.invoke('notify-buyer-email', {
							body: {
								buyerEmail: user.email,
								buyerName: user.user_metadata?.first_name || 'Valued Customer',
								orderCode,
								totalAmount,
								recipientName: `${recipient.firstName} ${recipient.lastName || ''}`.trim(),
								items: cartItems.map(item => ({
									name: item.name,
									quantity: item.quantity,
									price: parsePrice(item.price),
								})),
								estimatedArrival: '3-5 business days',
								shippingAddress: formattedAddress,
							},
						});
					} catch (buyerEmailError) {
						console.error('[Order] Failed to trigger buyer confirmation email:', buyerEmailError);
					}
				}

				return { order, error: null };
			} catch (err: any) {
				console.error('Unexpected error creating order:', err);
				return { order: null, error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshOrders, updateVideoMessageOrderId]
	);

	// Load next page of orders (appends to existing list)
	const loadMoreOrders = useCallback(async () => {
		if (!user || !hasMore || loadingMore) return;

		try {
			setLoadingMore(true);
			const fetched = await fetchOrdersPage(user.id, ORDERS_PER_PAGE, currentOffset);
			setOrders(prev => [...prev, ...fetched]);
			setCurrentOffset(prev => prev + fetched.length);
			setHasMore(fetched.length === ORDERS_PER_PAGE);
		} catch (err) {
			console.error('Error loading more orders:', err);
		} finally {
			setLoadingMore(false);
		}
	}, [user, hasMore, loadingMore, currentOffset, fetchOrdersPage]);

	const getOrderById = useCallback(
		(id: string): Order | undefined => {
			return orders.find((o) => o.id === id);
		},
		[orders]
	);

	const getOrderByCode = useCallback(
		(code: string): Order | undefined => {
			return orders.find((o) => o.orderCode === code);
		},
		[orders]
	);

	const value = useMemo(
		() => ({
			orders,
			loading,
			loadingMore,
			hasMore,
			createOrder,
			refreshOrders,
			loadMoreOrders,
			getOrderById,
			getOrderByCode,
		}),
		[orders, loading, loadingMore, hasMore, createOrder, refreshOrders, loadMoreOrders, getOrderById, getOrderByCode]
	);

	return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
	const ctx = useContext(OrdersContext);
	if (ctx === undefined) {
		throw new Error('useOrders must be used within OrdersProvider');
	}
	return ctx;
}

