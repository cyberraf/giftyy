import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HAS_SEEN_GUIDE_KEY = 'giftyy_has_seen_guide_v1';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type GuideSlide = {
	key: string;
	title: string;
	description: string;
	icon: IconSymbolName;
	/** Optional bundled screenshot from `assets/images` */
	image?: ImageSourcePropType;
};

// Keep this mapping empty until screenshots are added to `assets/images`.
// Once you add them, set these to `require('../assets/images/<file>.png')`.
// IMPORTANT: Don't reference files that don't exist yet, or Metro will fail to bundle.
const GUIDE_SCREENSHOTS: Record<string, ImageSourcePropType | undefined> = {
	home: require('../assets/images/guide-home.png'),
	card: require('../assets/images/guide-card.png'),
	video: require('../assets/images/guide-video.png'),
	sharedMemory: require('../assets/images/guide-shared-memory.png'),
	memories: require('../assets/images/guide-memories.png'),
	reactions: require('../assets/images/guide-reactions.png'),
};

export default function GuideScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ start?: string }>();
	const insets = useSafeAreaInsets();
	const listRef = useRef<FlatList<GuideSlide>>(null);
	const [index, setIndex] = useState(0);

	const slides: GuideSlide[] = useMemo(
		() => [
			{
				key: 'home',
				title: 'Shop gifts on Home',
				description: 'Browse the Home screen to discover and shop gifts for every occasion.',
				icon: 'house.fill',
				image: GUIDE_SCREENSHOTS.home,
			},
			{
				key: 'card',
				title: 'Add your Giftyy Card',
				description: 'During checkout, add a Giftyy Card so your gift can be linked to a memory.',
				icon: 'gift.fill',
				image: GUIDE_SCREENSHOTS.card,
			},
			{
				key: 'video',
				title: 'Record a video message',
				description: 'Create a short video message during checkout to make your gift more personal.',
				icon: 'video.fill',
				image: GUIDE_SCREENSHOTS.video,
			},
			{
				key: 'shared-memory',
				title: 'Add shared memories',
				description: 'Attach photos and shared moments during checkout to build an emotional experience.',
				icon: 'photo.fill',
				image: GUIDE_SCREENSHOTS.sharedMemory,
			},
			{
				key: 'memories',
				title: 'View memories anytime',
				description: 'Open the Memories screen to revisit all your sent and received moments.',
				icon: 'play.rectangle.on.rectangle.fill',
				image: GUIDE_SCREENSHOTS.memories,
			},
			{
				key: 'reactions',
				title: 'See recipient reactions',
				description: 'Watch how your recipients react to the memory you created for them.',
				icon: 'face.smiling.fill',
				image: GUIDE_SCREENSHOTS.reactions,
			},
		],
		[]
	);

	// Allow deep-linking to a specific slide (e.g. from Home "Key features" carousel)
	useEffect(() => {
		const start = typeof params.start === 'string' ? params.start : undefined;
		if (!start) return;
		const idx = slides.findIndex((s) => s.key === start);
		if (idx < 0) return;
		setIndex(idx);
		// Wait for FlatList to mount/layout
		requestAnimationFrame(() => {
			listRef.current?.scrollToIndex({ index: idx, animated: false });
		});
	}, [params.start, slides]);

	const finish = useCallback(async () => {
		try {
			await AsyncStorage.setItem(HAS_SEEN_GUIDE_KEY, '1');
		} catch {
			// If persisting fails, still allow navigation into the app.
		}
		router.replace('/');
	}, [router]);

	const goTo = useCallback((nextIndex: number) => {
		listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
	}, []);

	const handleNext = useCallback(() => {
		if (index >= slides.length - 1) {
			void finish();
			return;
		}
		goTo(index + 1);
	}, [finish, goTo, index, slides.length]);

	const handleBack = useCallback(() => {
		if (index <= 0) return;
		goTo(index - 1);
	}, [goTo, index]);

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
		<View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
			<View style={styles.topBar}>
				<View style={{ width: 64 }} />
				<Text style={styles.brand}>Giftyy</Text>
				<Pressable onPress={() => void finish()} accessibilityRole="button" accessibilityLabel="Skip guide">
					<Text style={styles.skip}>Skip</Text>
				</Pressable>
			</View>

			<FlatList
				ref={listRef}
				data={slides}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				keyExtractor={(s) => s.key}
				onMomentumScrollEnd={(e) => {
					const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
					setIndex(next);
				}}
				renderItem={({ item }) => (
					<View style={[styles.slide, { width: SCREEN_WIDTH }]}>
						<View style={styles.slideBody}>
							<View style={styles.heroFrame}>
								{item.image ? (
									<Image source={item.image} style={styles.heroImage} resizeMode="contain" />
								) : (
									<View style={styles.iconFallback}>
										<View style={styles.iconCircle}>
											<IconSymbol name={item.icon} size={28} color="#ffffff" />
										</View>
									</View>
								)}
							</View>

							<View style={styles.textCard}>
								<Text style={styles.title}>{item.title}</Text>
							</View>
						</View>
					</View>
				)}
			/>

			<View style={styles.dotsRow} accessibilityRole="tablist">
				{slides.map((s, i) => (
					<View
						key={s.key}
						accessibilityRole="tab"
						accessibilityState={{ selected: i === index }}
						style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
					/>
				))}
			</View>

			<View style={styles.actions}>
				<Pressable
					onPress={handleBack}
					disabled={index === 0}
					style={[styles.secondaryBtn, index === 0 && styles.btnDisabled]}
					accessibilityRole="button"
					accessibilityLabel="Back"
				>
					<Text style={[styles.secondaryText, index === 0 && styles.textDisabled]}>Back</Text>
				</Pressable>

				<Pressable
					onPress={handleNext}
					style={styles.primaryBtn}
					accessibilityRole="button"
					accessibilityLabel={index >= slides.length - 1 ? 'Get started' : 'Next'}
				>
					<Text style={styles.primaryText}>{index >= slides.length - 1 ? 'Get started' : 'Next'}</Text>
				</Pressable>
			</View>
		</View>
		</>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	topBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 10,
	},
	brand: {
		fontFamily: BRAND_FONT,
		fontSize: 18,
		color: '#111827',
		letterSpacing: -0.2,
	},
	skip: {
		fontSize: 14,
		fontWeight: '700',
		color: BRAND_COLOR,
	},
	slide: {
		paddingHorizontal: 18,
		justifyContent: 'center',
	},
	slideBody: {
		gap: 14,
	},
	heroFrame: {
		width: '100%',
		height: Math.min(SCREEN_HEIGHT * 0.72, 660),
		borderRadius: 22,
		overflow: 'hidden',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: 'rgba(17,24,39,0.10)',
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 4,
	},
	heroImage: {
		width: '100%',
		height: '100%',
	},
	iconFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff5f0',
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: BRAND_COLOR,
		alignItems: 'center',
		justifyContent: 'center',
	},
	textCard: {
		borderRadius: 22,
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: '#fff5f0',
		borderWidth: 1,
		borderColor: 'rgba(247,85,7,0.15)',
		alignItems: 'center',
	},
	title: {
		fontFamily: BRAND_FONT,
		fontSize: 18,
		color: '#111827',
		textAlign: 'center',
		marginBottom: 0,
	},
	dotsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingTop: 10,
		paddingBottom: 14,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	dotActive: {
		backgroundColor: BRAND_COLOR,
		width: 18,
	},
	dotInactive: {
		backgroundColor: 'rgba(17,24,39,0.18)',
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
		paddingHorizontal: 18,
	},
	secondaryBtn: {
		flex: 1,
		borderRadius: 999,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(17,24,39,0.12)',
		backgroundColor: '#ffffff',
	},
	secondaryText: {
		color: '#111827',
		fontWeight: '800',
	},
	primaryBtn: {
		flex: 1,
		borderRadius: 999,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: BRAND_COLOR,
	},
	primaryText: {
		color: '#ffffff',
		fontWeight: '900',
	},
	btnDisabled: {
		opacity: 0.45,
	},
	textDisabled: {
		opacity: 0.75,
	},
});

