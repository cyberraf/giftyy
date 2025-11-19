import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useCart, type CartItem } from './CartContext';
import { useCheckout, type Recipient } from '@/lib/CheckoutContext';
import { useVideoMessages } from './VideoMessagesContext';

export type OrderStatus = 'processing' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

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
	cardType?: 'Standard' | 'Premium' | 'Luxury';
	cardPrice: number;
	notifyRecipient: boolean;
	items: OrderItem[];
	itemsSubtotal: number;
	shippingCost: number;
	taxAmount: number;
	totalAmount: number;
	paymentLast4?: string;
	paymentBrand?: string;
	trackingNumber?: string;
	estimatedDeliveryDate?: string;
	deliveredAt?: string;
	createdAt: string;
	updatedAt: string;
};

type OrdersContextValue = {
	orders: Order[];
	loading: boolean;
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
		videoMessageId?: string
	) => Promise<{ order: Order | null; error: Error | null }>;
	refreshOrders: () => Promise<void>;
	getOrderById: (id: string) => Order | undefined;
	getOrderByCode: (code: string) => Order | undefined;
};

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
	const { user } = useAuth();
	const { updateVideoMessageOrderId } = useVideoMessages();

	// Fetch orders from Supabase
	const refreshOrders = useCallback(async () => {
		if (!user) {
			setOrders([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			// Fetch orders with their items
			const { data: ordersData, error: ordersError } = await supabase
				.from('orders')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (ordersError) {
				console.error('Error fetching orders:', ordersError);
				return;
			}

			if (!ordersData || ordersData.length === 0) {
				setOrders([]);
				setLoading(false);
				return;
			}

			// Fetch order items for all orders
			const orderIds = ordersData.map((o) => o.id);
			const { data: itemsData, error: itemsError } = await supabase
				.from('order_items')
				.select('*')
				.in('order_id', orderIds);

			if (itemsError) {
				console.error('Error fetching order items:', itemsError);
				return;
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

			// Combine orders with their items
			const fetchedOrders = ordersData.map((order) =>
				dbRowToOrder(order, itemsByOrderId.get(order.id) || [])
			);

			setOrders(fetchedOrders);
		} catch (err) {
			console.error('Unexpected error fetching orders:', err);
		} finally {
			setLoading(false);
		}
	}, [user]);

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
			videoMessageId?: string
		): Promise<{ order: Order | null; error: Error | null }> => {
			if (!user) {
				return { order: null, error: new Error('User not authenticated') };
			}

			try {
				const orderCode = generateOrderCode();

				// Create order
				const { data: orderData, error: orderError } = await supabase
					.from('orders')
					.insert({
						user_id: user.id,
						order_code: orderCode,
						status: 'processing',
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
						items_subtotal: itemsSubtotal,
						shipping_cost: shippingCost,
						tax_amount: taxAmount,
						total_amount: totalAmount,
						payment_last4: paymentLast4 || null,
						payment_brand: paymentBrand || null,
					})
					.select()
					.single();

				if (orderError) {
					console.error('Error creating order:', orderError);
					return { order: null, error: new Error(orderError.message) };
				}

				// Create order items
				const orderItems = cartItems.map((item) => {
					const unitPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
					return {
						order_id: orderData.id,
						product_id: item.id,
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

				return { order, error: null };
			} catch (err: any) {
				console.error('Unexpected error creating order:', err);
				return { order: null, error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshOrders, updateVideoMessageOrderId]
	);

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
			createOrder,
			refreshOrders,
			getOrderById,
			getOrderByCode,
		}),
		[orders, loading, createOrder, refreshOrders, getOrderById, getOrderByCode]
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

