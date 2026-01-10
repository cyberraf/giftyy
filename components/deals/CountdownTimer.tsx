/**
 * Countdown Timer Component
 * Timer badge with progress animation and color transitions
 */

import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';

function ProgressBar({ progress }: { progress: Animated.SharedValue<number> }) {
	const progressStyle = useAnimatedStyle(() => ({
		width: `${(1 - progress.value) * 100}%`,
	}));
	
	return <Animated.View style={[styles.progressBar, progressStyle]} />;
}

type Props = {
	endTime: number;
	size?: number;
};

export function CountdownTimer({ 
	endTime, 
	size = 60, 
}: Props) {
	const [timeLeft, setTimeLeft] = useState(0);
	const progress = useSharedValue(0);
	const opacity = useSharedValue(1);
	
	useEffect(() => {
		const updateTimer = () => {
			const now = Date.now();
			const remaining = Math.max(0, endTime - now);
			const total = 24 * 60 * 60 * 1000; // 24 hours
			const elapsed = total - remaining;
			
			setTimeLeft(Math.max(0, remaining));
			progress.value = withTiming(Math.min(1, elapsed / total), {
				duration: 1000,
			});
			
			// Pulse animation when time is running low
			if (remaining < 3600000) { // Less than 1 hour
				opacity.value = withTiming(0.7, { duration: 500 }, () => {
					opacity.value = withTiming(1, { duration: 500 });
				});
			}
		};
		
		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		
		return () => clearInterval(interval);
	}, [endTime]);
	
	const hours = Math.floor(timeLeft / (1000 * 60 * 60));
	const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
	
	const progressStyle = useAnimatedStyle(() => {
		const borderColor = progress.value > 0.8 
			? GIFTYY_THEME.colors.error 
			: progress.value > 0.5 
			? '#ff9500' 
			: '#4ade80';
			
		return {
			borderColor,
			opacity: opacity.value,
		};
	});
	
	// Determine text color based on time remaining
	const textColor = hours < 1 ? GIFTYY_THEME.colors.error : '#fff';
	const backgroundColor = hours < 1 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.15)';
	
	return (
		<View style={styles.container}>
			<Animated.View style={[
				styles.timerContainer, 
				{ width: size, height: size },
				progressStyle,
				{ backgroundColor }
			]}>
				<View style={styles.timerTextContainer}>
					<Text style={[styles.timerText, { color: textColor }]}>
						{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
					</Text>
					<Text style={[styles.timerLabel, { color: textColor }]}>Left</Text>
				</View>
				{/* Progress indicator bar */}
				<ProgressBar progress={progress} />
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'flex-start',
	},
	timerContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		borderRadius: 30,
		borderWidth: 2,
		borderColor: '#fff',
		overflow: 'hidden',
	},
	timerTextContainer: {
		alignItems: 'center',
		zIndex: 1,
	},
	timerText: {
		fontSize: 14,
		fontWeight: GIFTYY_THEME.typography.weights.extrabold,
		color: '#fff',
	},
	timerLabel: {
		fontSize: 9,
		fontWeight: GIFTYY_THEME.typography.weights.medium,
		color: 'rgba(255, 255, 255, 0.8)',
		marginTop: -2,
	},
	progressBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		height: 4,
		backgroundColor: 'rgba(255, 255, 255, 0.5)',
		borderRadius: 2,
	},
});

