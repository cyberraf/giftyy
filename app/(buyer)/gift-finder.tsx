import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useProducts } from '@/contexts/ProductsContext';
import { getGiftSuggestions, type GiftSuggestion, isOpenAIConfigured } from '@/lib/openai';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GiftFinderScreen() {
	const router = useRouter();
	const { top } = useSafeAreaInsets();
	const { products, loading: productsLoading } = useProducts();
	const [prompt, setPrompt] = useState('');
	const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleGetSuggestions = useCallback(async () => {
		if (!prompt.trim()) {
			Alert.alert('Please enter a description', 'Tell us who the gift is for or what occasion you\'re celebrating.');
			return;
		}

		console.log('[GiftFinder Screen] User clicked "Get AI Suggestions"');
		console.log('[GiftFinder Screen] Prompt:', prompt);
		console.log('[GiftFinder Screen] Products loaded:', products.length);
		console.log('[GiftFinder Screen] Products loading:', productsLoading);

		setLoading(true);
		setError(null);

		try {
			console.log('[GiftFinder Screen] Calling getGiftSuggestions...');
			const results = await getGiftSuggestions(prompt, {
				products,
				maxResults: 6,
			});
			console.log('[GiftFinder Screen] ✅ Received', results.length, 'suggestions');
			setSuggestions(results);
		} catch (err) {
			console.error('[GiftFinder Screen] ❌ Error getting gift suggestions:', err);
			console.error('[GiftFinder Screen] Error details:', err instanceof Error ? err.message : String(err));
			setError('Failed to get suggestions. Please try again.');
			setSuggestions([]);
		} finally {
			setLoading(false);
			console.log('[GiftFinder Screen] Request completed');
		}
	}, [prompt, products, productsLoading]);

	const handleSuggestionPress = useCallback((suggestion: GiftSuggestion) => {
		if (suggestion.productId) {
			router.push(`/(buyer)/(tabs)/product/${suggestion.productId}`);
		} else {
			// If no product ID, navigate to home or collections
			router.push('/(buyer)/(tabs)/home');
		}
	}, [router]);

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: top + 8 }]}>
				<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
					<IconSymbol name="chevron.left" size={22} color="#1f1f1f" />
				</Pressable>
				<Text style={styles.headerTitle}>AI Gift Finder</Text>
				<View style={{ width: 40 }} />
			</View>
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
				<Text style={styles.subtitle}>
					Describe who you're shopping for, and we'll suggest the perfect gifts
				</Text>

			{!isOpenAIConfigured && (
				<View style={styles.warningBox}>
					<Text style={styles.warningText}>
						⚠️ OpenAI API key not configured. Using fallback suggestions.
					</Text>
					<Text style={styles.warningSubtext}>
						Add EXPO_PUBLIC_OPENAI_API_KEY to your .env.local file for AI-powered suggestions.
					</Text>
				</View>
			)}

			<TextInput
				placeholder="Who is this for? (e.g., mom, best friend, wedding, birthday)"
				style={styles.input}
				value={prompt}
				onChangeText={setPrompt}
				multiline
				numberOfLines={3}
				textAlignVertical="top"
				editable={!loading}
			/>

			<Pressable
				style={[styles.button, loading && styles.buttonDisabled]}
				onPress={handleGetSuggestions}
				disabled={loading || productsLoading}
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.buttonLabel}>Get AI Suggestions</Text>
				)}
			</Pressable>

			{error && (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{suggestions.length > 0 && (
				<View style={styles.suggestionsContainer}>
					<Text style={styles.suggestionsTitle}>Suggested Gifts</Text>
					{suggestions.map((suggestion, index) => (
						<Pressable
							key={index}
							style={styles.suggestionCard}
							onPress={() => handleSuggestionPress(suggestion)}
						>
							<View style={styles.suggestionContent}>
								<Text style={styles.suggestionTitle}>{suggestion.title}</Text>
								<Text style={styles.suggestionReason}>{suggestion.reason}</Text>
								{suggestion.priceHint && (
									<Text style={styles.suggestionPrice}>{suggestion.priceHint}</Text>
								)}
							</View>
							{suggestion.productId && (
								<Text style={styles.viewProductText}>View Product →</Text>
							)}
						</Pressable>
					))}
				</View>
			)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 12,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E4E1DC',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	headerTitle: {
		fontFamily: BRAND_FONT,
		fontSize: 24,
		fontWeight: '800',
		color: '#1f1f1f',
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
	},
	subtitle: {
		fontSize: 16,
		color: '#766A61',
		marginBottom: 24,
		lineHeight: 22,
	},
	warningBox: {
		backgroundColor: '#FEF3C7',
		borderColor: '#F59E0B',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 20,
	},
	warningText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#92400E',
		marginBottom: 4,
	},
	warningSubtext: {
		fontSize: 12,
		color: '#78350F',
		lineHeight: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#E6DED6',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
		fontSize: 16,
		color: '#2F2318',
		minHeight: 100,
		marginBottom: 16,
	},
	button: {
		backgroundColor: BRAND_COLOR,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
		shadowColor: BRAND_COLOR,
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonLabel: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
		fontFamily: BRAND_FONT,
	},
	errorBox: {
		backgroundColor: '#FEE2E2',
		borderColor: '#EF4444',
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 20,
	},
	errorText: {
		fontSize: 14,
		color: '#991B1B',
	},
	suggestionsContainer: {
		marginTop: 8,
	},
	suggestionsTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#2F2318',
		marginBottom: 16,
		fontFamily: BRAND_FONT,
	},
	suggestionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E6DED6',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	suggestionContent: {
		flex: 1,
		marginRight: 12,
	},
	suggestionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#2F2318',
		marginBottom: 6,
		fontFamily: BRAND_FONT,
	},
	suggestionReason: {
		fontSize: 14,
		color: '#766A61',
		lineHeight: 20,
		marginBottom: 4,
	},
	suggestionPrice: {
		fontSize: 16,
		fontWeight: '600',
		color: BRAND_COLOR,
		marginTop: 4,
	},
	viewProductText: {
		fontSize: 14,
		color: BRAND_COLOR,
		fontWeight: '600',
	},
});


