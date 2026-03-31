import { BRAND_COLOR } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmailVerifiedScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Image
						source={require('@/assets/images/giftyy.png')}
						style={styles.logo}
						resizeMode="contain"
					/>

					<View style={styles.iconCircle}>
						<MaterialIcons name="check-circle" size={56} color="#22c55e" />
					</View>

					<Text style={styles.title}>Email Verified!</Text>
					<Text style={styles.subtitle}>
						Your account has been confirmed successfully.{'\n'}
						You can now sign in and start gifting.
					</Text>
				</View>

				<Pressable
					style={styles.primaryButton}
					onPress={() => router.replace('/(auth)/login')}
				>
					<MaterialIcons name="login" size={20} color="white" style={styles.buttonIcon} />
					<Text style={styles.primaryButtonText}>Sign In</Text>
				</Pressable>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 40,
		paddingBottom: 32,
		justifyContent: 'center',
	},
	header: {
		alignItems: 'center',
		marginBottom: 32,
	},
	logo: {
		width: 120,
		height: 120,
		marginBottom: 24,
	},
	iconCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#f0fdf4',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	title: {
		fontSize: 28,
		fontWeight: '800',
		color: '#1F2937',
		marginBottom: 10,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 15,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 22,
	},
	primaryButton: {
		backgroundColor: BRAND_COLOR,
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		shadowColor: BRAND_COLOR,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	buttonIcon: {
		marginRight: 10,
	},
});
