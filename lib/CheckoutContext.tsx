import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export type Recipient = {
    firstName: string;
    lastName: string;
    street: string;
    apartment?: string;
    city: string;
    state: string; // state/province code, e.g., 'CA'
    country: string;
    zip: string;
    phone?: string;
    email?: string;
};
export type CardType = 'Standard' | 'Premium' | 'Luxury' | 'Giftyy Card' | '';
export type Payment = { name: string; cardNumber: string; expiry: string; cvv: string };

type CheckoutState = {
    recipient: Recipient;
    setRecipient: (r: Recipient) => void;
    cardPrice: number;
    setCardPrice: (p: number) => void;
    defaultGiftyyCardPrice: number; // Dynamic price from database
    notifyRecipient: boolean;
    setNotifyRecipient: (v: boolean) => void;
    cardType: CardType;
    setCardType: (t: CardType) => void;
    videoUri?: string; // Uploaded video URL (after successful upload)
    setVideoUri: (u?: string) => void;
    videoTitle?: string;
    setVideoTitle: (t?: string) => void;
    localVideoUri?: string; // Local file URI (before upload)
    setLocalVideoUri: (u?: string) => void;
    videoDurationMs?: number; // Duration in milliseconds
    setVideoDurationMs: (d?: number) => void;
    sharedMemoryId?: string;
    setSharedMemoryId: (id?: string) => void;
    // Temporary memory data (before saving to database)
    localMemoryPhotoUri?: string;
    setLocalMemoryPhotoUri: (uri?: string) => void;
    memoryCaption?: string;
    setMemoryCaption: (caption?: string) => void;
    memoryText?: string;
    setMemoryText: (text?: string) => void;
    memoryType?: 'photo' | 'text' | null;
    setMemoryType: (type?: 'photo' | 'text' | null) => void;
    payment: Payment;
    setPayment: (p: Payment) => void;
    reset: () => void;
};

const CheckoutContext = createContext<CheckoutState | undefined>(undefined);

const initialRecipient: Recipient = {
    firstName: '',
    lastName: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    country: 'United States',
    zip: '',
    phone: '',
    email: '',
};
const initialPayment: Payment = { name: '', cardNumber: '', expiry: '', cvv: '' };

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
    const [recipient, setRecipient] = useState<Recipient>(initialRecipient);
    const [cardPrice, setCardPrice] = useState<number>(0);
    const [notifyRecipient, setNotifyRecipient] = useState<boolean>(true);
    const [cardType, setCardType] = useState<CardType>('');
    const [videoUri, setVideoUri] = useState<string | undefined>(undefined);
    const [videoTitle, setVideoTitle] = useState<string | undefined>(undefined);
    const [localVideoUri, setLocalVideoUri] = useState<string | undefined>(undefined);
    const [videoDurationMs, setVideoDurationMs] = useState<number | undefined>(undefined);
    const [sharedMemoryId, setSharedMemoryId] = useState<string | undefined>(undefined);
    const [localMemoryPhotoUri, setLocalMemoryPhotoUri] = useState<string | undefined>(undefined);
    const [memoryCaption, setMemoryCaption] = useState<string | undefined>(undefined);
    const [memoryText, setMemoryText] = useState<string | undefined>(undefined);
    const [memoryType, setMemoryType] = useState<'photo' | 'text' | null | undefined>(undefined);
    const [payment, setPayment] = useState<Payment>(initialPayment);
    const [defaultGiftyyCardPrice, setDefaultGiftyyCardPrice] = useState<number>(5.0); // Default fallback

    // Fetch dynamic Giftyy card price from database on mount
    useEffect(() => {
        const fetchGiftyyCardPrice = async () => {
            try {
                const { data, error } = await supabase
                    .from('global_vendor_settings')
                    .select('value')
                    .eq('key', 'giftyy_card_price')
                    .single();

                if (error) {
                    console.warn('Could not fetch Giftyy card price from database, using default:', error);
                    return;
                }

                if (data?.value) {
                    const price = parseFloat(data.value);
                    if (!isNaN(price) && price > 0) {
                        setDefaultGiftyyCardPrice(price);
                    }
                }
            } catch (err) {
                console.error('Unexpected error fetching Giftyy card price:', err);
            }
        };

        fetchGiftyyCardPrice();
    }, []); // Run once on mount

    const reset = () => {
        setRecipient(initialRecipient);
        setCardPrice(0);
        setNotifyRecipient(true);
        setCardType('');
        setVideoUri(undefined);
        setVideoTitle(undefined);
        setLocalVideoUri(undefined);
        setVideoDurationMs(undefined);
        setSharedMemoryId(undefined);
        setLocalMemoryPhotoUri(undefined);
        setMemoryCaption(undefined);
        setMemoryText(undefined);
        setMemoryType(undefined);
        setPayment(initialPayment);
    };

    const value = useMemo(
        () => ({
            recipient, setRecipient,
            cardPrice, setCardPrice,
            defaultGiftyyCardPrice,
            notifyRecipient, setNotifyRecipient,
            cardType, setCardType,
            videoUri, setVideoUri,
            videoTitle, setVideoTitle,
            localVideoUri, setLocalVideoUri,
            videoDurationMs, setVideoDurationMs,
            sharedMemoryId, setSharedMemoryId,
            localMemoryPhotoUri, setLocalMemoryPhotoUri,
            memoryCaption, setMemoryCaption,
            memoryText, setMemoryText,
            memoryType, setMemoryType,
            payment, setPayment,
            reset
        }),
        [recipient, cardPrice, notifyRecipient, cardType, videoUri, videoTitle, localVideoUri, videoDurationMs, sharedMemoryId, localMemoryPhotoUri, memoryCaption, memoryText, memoryType, payment, defaultGiftyyCardPrice]
    );
    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
    const ctx = useContext(CheckoutContext);
    if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
    return ctx;
}


