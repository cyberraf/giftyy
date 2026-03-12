import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useState } from 'react';

// The steps of our interactive tour mapping to specific features
export type TourStep =
    | 'home_ai_chat'
    | 'home_burger_menu'
    | 'home_tagging'
    | 'shop_intro'
    | 'recipients_intro'
    | 'profile_occasions'
    | 'profile_circle'
    | 'profile_preferences'
    | 'memories_intro'
    | 'memory_messages'
    | 'memory_reactions'
    | 'memory_shared'
    | 'tour_complete';

// Order of the tour
const TOUR_SEQUENCE: TourStep[] = [
    'shop_intro',
    'recipients_intro',
    'profile_circle',
    'profile_preferences',
];

// Mapping from step -> the screen route that must be visible for that step
const STEP_ROUTES: Partial<Record<TourStep, string>> = {
    'home_ai_chat': '/(buyer)/(tabs)',
    'shop_intro': '/(buyer)/(tabs)/shop',
    'recipients_intro': '/(buyer)/(tabs)/recipients',
    'profile_occasions': '/(buyer)/(tabs)/recipients?tab=occasions',
    'profile_circle': '/(buyer)/(tabs)/recipients?tab=circle',
    'profile_preferences': '/(buyer)/(tabs)/recipients?tab=preferences',
    'memories_intro': '/(buyer)/(tabs)/memory',
};

export type TourElementMap = Record<TourStep, { x: number; y: number; width: number; height: number; ready: boolean } | null>;

interface TourContextType {
    isActive: boolean;
    currentStep: TourStep | null;
    elements: TourElementMap;
    registerElement: (step: TourStep, layout: { x: number; y: number; width: number; height: number }) => void;
    unregisterElement: (step: TourStep) => void;
    startTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    completeTour: () => void;
    targetRoute: string | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_COMPLETED_KEY = 'giftyy_interactive_tour_completed_v1';

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
    const [elements, setElements] = useState<TourElementMap>({} as TourElementMap);
    const [targetRoute, setTargetRoute] = useState<string | null>(null);

    const registerElement = useCallback((step: TourStep, layout: { x: number; y: number; width: number; height: number }) => {
        setElements(prev => ({
            ...prev,
            [step]: { ...layout, ready: true }
        }));
    }, []);

    const unregisterElement = useCallback((step: TourStep) => {
        setElements(prev => ({
            ...prev,
            [step]: null
        }));
    }, []);

    const startTour = useCallback(() => {
        console.log('[TOUR] startTour() called! Setting isActive=true, step=home_ai_chat');
        const firstStep = TOUR_SEQUENCE[0];
        setIsActive(true);
        setCurrentStep(firstStep);
        setTargetRoute(STEP_ROUTES[firstStep] ?? null);
    }, []);

    const skipTour = useCallback(async () => {
        setIsActive(false);
        setCurrentStep(null);
        setTargetRoute(null);
        try {
            await AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true');
        } catch (e) {
            console.warn('Failed to save tour completion', e);
        }
    }, []);

    const completeTour = skipTour;

    const nextStep = useCallback(() => {
        setCurrentStep(prev => {
            if (!prev) return null;
            const currentIndex = TOUR_SEQUENCE.indexOf(prev);
            if (currentIndex === -1 || currentIndex === TOUR_SEQUENCE.length - 1) {
                // Done — persist and close
                AsyncStorage.setItem(TOUR_COMPLETED_KEY, 'true').catch(() => { });
                setIsActive(false);
                setTargetRoute(null);
                return null;
            }
            const next = TOUR_SEQUENCE[currentIndex + 1];
            setTargetRoute(STEP_ROUTES[next] ?? null);
            return next;
        });
    }, []);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => {
            if (!prev) return null;
            const currentIndex = TOUR_SEQUENCE.indexOf(prev);
            if (currentIndex <= 0) return prev; // Already on first step
            const previous = TOUR_SEQUENCE[currentIndex - 1];
            setTargetRoute(STEP_ROUTES[previous] ?? null);
            return previous;
        });
    }, []);

    return (
        <TourContext.Provider
            value={{
                isActive,
                currentStep,
                elements,
                registerElement,
                unregisterElement,
                startTour,
                nextStep,
                prevStep,
                skipTour,
                completeTour,
                targetRoute
            }}
        >
            {children}
        </TourContext.Provider>
    );
}

export const useTour = () => {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
