import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

type Ctx = {
	visible: boolean;
	setVisible: (v: boolean) => void;
	translateY: Animated.Value;
};

const BottomBarVisibilityContext = createContext<Ctx | undefined>(undefined);

export function BottomBarVisibilityProvider({ children }: { children: React.ReactNode }) {
	const [visible, setVisible] = useState(true);
	const translateY = useRef(new Animated.Value(0)).current;

	const value = useMemo(() => ({ visible, setVisible, translateY }), [visible, translateY]);
	return <BottomBarVisibilityContext.Provider value={value}>{children}</BottomBarVisibilityContext.Provider>;
}

export function useBottomBarVisibility() {
	const ctx = useContext(BottomBarVisibilityContext);
	if (!ctx) throw new Error('useBottomBarVisibility must be used within BottomBarVisibilityProvider');
	return ctx;
}


