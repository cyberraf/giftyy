import { useAuth } from '@/contexts/AuthContext';
import { logProductAnalyticsEvent } from '@/lib/product-analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = {
    id: string;
    /** DB product id (products.id) */
    productId: string;
    name: string;
    price: string; // keep as formatted string for now
    image?: string;
    quantity: number;
    selectedOptions?: Record<string, string>;
    vendorId?: string; // Vendor who owns this product
};

const CART_STORAGE_KEY_BASE = '@giftyy:cart';

type CartContextValue = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clear: () => void;
    totalQuantity: number;
    loading: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const userCartKey = useMemo(() =>
        user ? `${CART_STORAGE_KEY_BASE}:${user.id}` : `${CART_STORAGE_KEY_BASE}:guest`,
        [user]);

    // Load cart whenever the storage key (user) changes
    useEffect(() => {
        const loadCart = async () => {
            setLoading(true);
            try {
                const stored = await AsyncStorage.getItem(userCartKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        // Backfill older cart items that didn't store productId
                        const hydrated = parsed.map((it: any) => ({
                            ...it,
                            productId: it.productId || it.product_id || it.id,
                        }));
                        setItems(hydrated);
                    } else {
                        setItems([]);
                    }
                } else {
                    setItems([]);
                }
            } catch (error) {
                console.error('Error loading cart from storage:', error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };
        loadCart();
    }, [userCartKey]);

    // Save cart to AsyncStorage whenever items change (and we aren't loading)
    useEffect(() => {
        if (!loading) {
            const saveCart = async () => {
                try {
                    await AsyncStorage.setItem(userCartKey, JSON.stringify(items));
                } catch (error) {
                    console.error('Error saving cart to storage:', error);
                }
            };
            saveCart();
        }
    }, [items, loading, userCartKey]);

    const addItem: CartContextValue['addItem'] = useCallback((newItem) => {
        setItems((prev) => {
            const idx = prev.findIndex((p) => p.id === newItem.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + (newItem.quantity ?? 1) };
                return copy;
            }
            return [...prev, { ...newItem, quantity: newItem.quantity ?? 1 }];
        });

        logProductAnalyticsEvent({
            productId: (newItem as any).productId || newItem.id,
            eventType: 'added_to_cart',
            metadata: {
                quantity: newItem.quantity ?? 1,
            },
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, quantity) } : p)));
    }, []);

    const clear = useCallback(async () => {
        setItems([]);
        try {
            await AsyncStorage.removeItem(userCartKey);
        } catch (error) {
            console.error('Error clearing cart from storage:', error);
        }
    }, [userCartKey]);

    const totalQuantity = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

    const value = useMemo(() => ({ items, addItem, removeItem, updateQuantity, clear, totalQuantity, loading }), [items, addItem, removeItem, updateQuantity, clear, totalQuantity, loading]);
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}


