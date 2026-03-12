import PremiumToast, { ToastType } from '@/components/ui/PremiumToast';
import { setToastHandler } from '@/lib/AlertManager';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastState = {
    visible: boolean;
    message: string;
    type: ToastType;
    duration?: number;
};

type ToastContextType = {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    hideToast: () => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toastState, setToastState] = useState<ToastState>({
        visible: false,
        message: '',
        type: 'info',
    });

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
        setToastState({
            visible: true,
            message,
            type,
            duration,
        });
    }, []);

    const hideToast = useCallback(() => {
        setToastState((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        setToastHandler(showToast);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            <PremiumToast
                visible={toastState.visible}
                message={toastState.message}
                type={toastState.type}
                duration={toastState.duration}
                onHide={hideToast}
            />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
