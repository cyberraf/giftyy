import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
    id: string;
    name: string;
    price: string; // keep as formatted string for now
    image?: string;
    quantity: number;
    selectedOptions?: Record<string, string>;
    vendorId?: string; // Vendor who owns this product
};

const CART_STORAGE_KEY = '@giftyy:cart';

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
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load cart from AsyncStorage on mount
    useEffect(() => {
        const loadCart = async () => {
            try {
                const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setItems(parsed);
                    }
                }
            } catch (error) {
                console.error('Error loading cart from storage:', error);
            } finally {
                setLoading(false);
            }
        };
        loadCart();
    }, []);

    // Save cart to AsyncStorage whenever items change
    useEffect(() => {
        if (!loading) {
            const saveCart = async () => {
                try {
                    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
                } catch (error) {
                    console.error('Error saving cart to storage:', error);
                }
            };
            saveCart();
        }
    }, [items, loading]);

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
            await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing cart from storage:', error);
        }
    }, []);

    const totalQuantity = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

    const value = useMemo(() => ({ items, addItem, removeItem, updateQuantity, clear, totalQuantity, loading }), [items, addItem, removeItem, updateQuantity, clear, totalQuantity, loading]);
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}


