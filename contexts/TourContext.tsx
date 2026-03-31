import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { TourOverlay } from '@/components/tour/TourOverlay';

// All possible tour steps
export type TourStep =
	| 'welcome'
	| 'home_ai_chat'
	| 'home_tagging'
	| 'home_burger_menu'
	| 'global_profile'
	| 'shop_intro'
	| 'circle_tab'
	| 'occasions_tab'
	| 'preferences_tab'
	| 'memories_intro'
	| 'settings_reminders';

// Per-screen tour groups
export type TourGroup = 'home' | 'shop' | 'recipients' | 'memories' | 'settings';

const TOUR_GROUPS: Record<TourGroup, TourStep[]> = {
	home: ['welcome', 'home_ai_chat', 'home_tagging', 'home_burger_menu', 'global_profile'],
	shop: ['shop_intro'],
	recipients: ['circle_tab', 'occasions_tab', 'preferences_tab'],
	memories: ['memories_intro'],
	settings: ['settings_reminders'],
};

const TOUR_STORAGE_PREFIX = 'giftyy_tour_';

export type TourElementMap = Record<TourStep, { x: number; y: number; width: number; height: number; ready: boolean } | null>;

interface TourContextType {
	isActive: boolean;
	currentStep: TourStep | null;
	currentGroup: TourGroup | null;
	elements: TourElementMap;
	registerElement: (step: TourStep, layout: { x: number; y: number; width: number; height: number }) => void;
	unregisterElement: (step: TourStep) => void;
	startTour: (group: TourGroup) => void;
	nextStep: () => void;
	prevStep: () => void;
	skipTour: () => void;
	isGroupCompleted: (group: TourGroup) => Promise<boolean>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

function storageKey(group: TourGroup) {
	return `${TOUR_STORAGE_PREFIX}${group}_v1`;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
	const [isActive, setIsActive] = useState(false);
	const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
	const [currentGroup, setCurrentGroup] = useState<TourGroup | null>(null);
	const [elements, setElements] = useState<TourElementMap>({} as TourElementMap);

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

	const markGroupComplete = useCallback(async (group: TourGroup) => {
		try {
			await AsyncStorage.setItem(storageKey(group), 'true');
		} catch (e) {
			console.warn('Failed to save tour completion', e);
		}
	}, []);

	const startTour = useCallback((group: TourGroup) => {
		const steps = TOUR_GROUPS[group];
		if (!steps || steps.length === 0) return;
		setCurrentGroup(group);
		setCurrentStep(steps[0]);
		setIsActive(true);
	}, []);

	const skipTour = useCallback(async () => {
		if (currentGroup) {
			await markGroupComplete(currentGroup);
		}
		setIsActive(false);
		setCurrentStep(null);
		setCurrentGroup(null);
	}, [currentGroup, markGroupComplete]);

	const nextStep = useCallback(() => {
		if (!currentGroup || !currentStep) return;
		const steps = TOUR_GROUPS[currentGroup];
		const idx = steps.indexOf(currentStep);
		if (idx === -1 || idx === steps.length - 1) {
			// Last step in group — complete
			markGroupComplete(currentGroup);
			setIsActive(false);
			setCurrentStep(null);
			setCurrentGroup(null);
		} else {
			setCurrentStep(steps[idx + 1]);
		}
	}, [currentGroup, currentStep, markGroupComplete]);

	const prevStep = useCallback(() => {
		if (!currentGroup || !currentStep) return;
		const steps = TOUR_GROUPS[currentGroup];
		const idx = steps.indexOf(currentStep);
		if (idx <= 0) return;
		setCurrentStep(steps[idx - 1]);
	}, [currentGroup, currentStep]);

	const isGroupCompleted = useCallback(async (group: TourGroup): Promise<boolean> => {
		try {
			const val = await AsyncStorage.getItem(storageKey(group));
			return val === 'true';
		} catch {
			return false;
		}
	}, []);

	return (
		<TourContext.Provider
			value={{
				isActive,
				currentStep,
				currentGroup,
				elements,
				registerElement,
				unregisterElement,
				startTour,
				nextStep,
				prevStep,
				skipTour,
				isGroupCompleted,
			}}
		>
			{children}
			<TourOverlay />
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
