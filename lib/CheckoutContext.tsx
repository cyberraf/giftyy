import React, { createContext, useContext, useMemo, useState } from 'react';

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
export type CardType = 'Standard' | 'Premium' | 'Luxury' | '';
export type Payment = { name: string; cardNumber: string; expiry: string; cvv: string };

type CheckoutState = {
    recipient: Recipient;
    setRecipient: (r: Recipient) => void;
    cardPrice: number;
    setCardPrice: (p: number) => void;
    notifyRecipient: boolean;
    setNotifyRecipient: (v: boolean) => void;
    cardType: CardType;
    setCardType: (t: CardType) => void;
    videoUri?: string;
    setVideoUri: (u?: string) => void;
    videoTitle?: string;
    setVideoTitle: (t?: string) => void;
    sharedMemoryId?: string;
    setSharedMemoryId: (id?: string) => void;
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
    const [notifyRecipient, setNotifyRecipient] = useState<boolean>(false);
    const [cardType, setCardType] = useState<CardType>('');
    const [videoUri, setVideoUri] = useState<string | undefined>(undefined);
    const [videoTitle, setVideoTitle] = useState<string | undefined>(undefined);
    const [sharedMemoryId, setSharedMemoryId] = useState<string | undefined>(undefined);
    const [payment, setPayment] = useState<Payment>(initialPayment);

    const reset = () => {
        setRecipient(initialRecipient);
        setCardPrice(0);
        setNotifyRecipient(false);
        setCardType('');
        setVideoUri(undefined);
        setVideoTitle(undefined);
        setSharedMemoryId(undefined);
        setPayment(initialPayment);
    };

    const value = useMemo(
        () => ({ recipient, setRecipient, cardPrice, setCardPrice, notifyRecipient, setNotifyRecipient, cardType, setCardType, videoUri, setVideoUri, videoTitle, setVideoTitle, sharedMemoryId, setSharedMemoryId, payment, setPayment, reset }),
        [recipient, cardPrice, notifyRecipient, cardType, videoUri, videoTitle, sharedMemoryId, payment]
    );
    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
    const ctx = useContext(CheckoutContext);
    if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
    return ctx;
}


