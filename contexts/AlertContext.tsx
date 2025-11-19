import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '@/components/CustomAlert';

type AlertButton = {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = {
	visible: boolean;
	title: string;
	message: string;
	buttons: AlertButton[];
};

type AlertContextType = {
	alert: (title: string, message: string, buttons?: AlertButton[]) => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
	const [alertState, setAlertState] = useState<AlertState>({
		visible: false,
		title: '',
		message: '',
		buttons: [],
	});

	const showAlert = useCallback((title: string, message: string, buttons?: AlertButton[]) => {
		setAlertState({
			visible: true,
			title,
			message,
			buttons: buttons || [{ text: 'OK' }],
		});
	}, []);

	const handleDismiss = useCallback(() => {
		setAlertState((prev) => ({ ...prev, visible: false }));
	}, []);

	return (
		<AlertContext.Provider value={{ alert: showAlert }}>
			{children}
			<CustomAlert
				visible={alertState.visible}
				title={alertState.title}
				message={alertState.message}
				buttons={alertState.buttons}
				onDismiss={handleDismiss}
			/>
		</AlertContext.Provider>
	);
}

export function useAlert() {
	const context = useContext(AlertContext);
	if (context === undefined) {
		throw new Error('useAlert must be used within an AlertProvider');
	}
	return context;
}

