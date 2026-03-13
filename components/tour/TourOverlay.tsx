import { TourStep, useTour } from '@/contexts/TourContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// On Android, measureInWindow returns Y relative to the app window (below status bar).
// A Modal with statusBarTranslucent renders from Y=0 = physical screen top.
// Adding status bar height bridges the two coordinate systems.
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 0;
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';

const STEP_CONTENT: Record<TourStep, { title: string; body: string }> = {
	'welcome': { title: '👋 Welcome to Giftyy', body: 'Let’s take a quick tour to show you how to find the perfect gifts for your loved ones.' },
	'home_ai_chat': { title: '🎁 AI Gift Concierge', body: 'Type anything here! Ask for gift ideas for any occasion, person, or budget. Giftyy AI is here to help.' },
	'home_burger_menu': { title: '🍔 Quick Navigation', body: 'Access all areas of the app quickly through the side menu.' },
	'global_profile': { title: '👤 Your Profile', body: 'Manage your settings, notifications, and orders from your profile menu.' },
	'shop_intro': { title: '🛍️ Premium Shop', body: 'Browse curated gifts from top vendors. We’ve handpicked the best items for your Circle.' },
	'circle_tab': { title: '🫂 My Circle', body: 'This is where your loved ones live. Add friends and family to see their preferences and occasions.' },
	'occasions_tab': { title: '📅 My Occasions', body: 'Keep track of your own important dates so your Circle never misses a celebration!' },
	'preferences_tab': { title: '⭐ My Preferences', body: 'Tell your Circle what you love. We use these to suggest the perfect gifts for you.' },
	'memories_intro': { title: '📼 Digital Memories', body: 'Relive the joy! Every gift card comes with photos, videos, and reactions saved forever.' },
	'tour_complete': { title: "🎉 You're All Set!", body: 'You’re ready to start gifting. Add someone to your Circle to get started!' }
};

export function TourOverlay() {
    const { isActive, currentStep, elements, nextStep, prevStep, skipTour, targetRoute } = useTour();
    const router = useRouter();
    const lastRoute = useRef<string | null>(null);

    useEffect(() => {
        if (!isActive || !targetRoute) return;
        if (targetRoute !== lastRoute.current) {
            lastRoute.current = targetRoute;
            router.push(targetRoute as any);
        }
    }, [isActive, targetRoute]);

    if (isActive) {
        console.log('[TOUR] Overlay Rendering! isActive=true, currentStep=', currentStep);
    }

    if (!isActive || !currentStep) return null;

    // Helpers that close the tour and go home
    const handleSkip = () => {
        skipTour();
        router.replace('/(buyer)/(tabs)' as any);
    };
    const handleFinish = () => {
        nextStep();
        if (isLastStep) {
            router.replace('/(buyer)/(tabs)' as any);
        }
    };

    const target = elements[currentStep];
    const content = STEP_CONTENT[currentStep];

    // Element coordinates, corrected for Modal's physical screen origin
    const rawY = target?.ready ? target.y : SCREEN_HEIGHT / 2;
    const cx = target?.ready ? target.x : SCREEN_WIDTH / 2;
    const cy = rawY + STATUS_BAR_HEIGHT;
    const cw = target?.ready ? target.width : 0;
    const ch = target?.ready ? target.height : 0;

    // Tooltip placement: above element when bottom space is tight
    const spaceBelow = SCREEN_HEIGHT - (cy + ch);
    const tooltipTop = spaceBelow < 300
        ? Math.max(STATUS_BAR_HEIGHT + 20, cy - 30 - 240) // More clearance above
        : cy + ch + 20;

    const isLastStep = currentStep === 'tour_complete';
    const isFirstStep = currentStep === 'welcome';

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(250)}
            style={[StyleSheet.absoluteFill, { zIndex: 9999, pointerEvents: 'box-none' }]}
        >
            {/*
             * 4-panel spotlight approach:
             * The element is left UNCOVERED (transparent hole).
             * Four dark panels surround it — top, bottom, left, right.
             */}
            {/* Top */}
            <View style={[styles.panel, { top: 0, left: 0, right: 0, height: Math.max(0, cy) }]} />
            {/* Bottom */}
            <View style={[styles.panel, { top: cy + ch, left: 0, right: 0, bottom: 0 }]} />
            {/* Left */}
            <View style={[styles.panel, { top: cy, left: 0, width: Math.max(0, cx), height: ch }]} />
            {/* Right */}
            <View style={[styles.panel, { top: cy, left: cx + cw, right: 0, height: ch }]} />

            {/* Tooltip card */}
            {content && (
                <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(200)}
                    style={[styles.tooltipCard, { top: tooltipTop }]}
                    pointerEvents="box-none"
                >
                    <Text style={styles.tooltipTitle}>{content.title}</Text>
                    <Text style={styles.tooltipBody}>{content.body}</Text>

                    <View style={styles.tooltipActions}>
                        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={styles.skipText}>Skip Tour</Text>
                        </TouchableOpacity>
                        <View style={styles.rightActions}>
                            {!isFirstStep && (
                                <TouchableOpacity onPress={prevStep} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                    <Text style={styles.backText}>← Back</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={handleFinish} style={styles.nextBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                <Text style={styles.nextText}>{isLastStep ? 'Finish 🎉' : 'Next →'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
	panel: {
		position: 'absolute',
		backgroundColor: OVERLAY_COLOR,
	},
	tooltipCard: {
		position: 'absolute',
		left: 20,
		right: 20,
		backgroundColor: '#fff',
		borderRadius: 24,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.22,
		shadowRadius: 20,
		elevation: 16,
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.05)',
	},
	tooltipTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#111',
		marginBottom: 10,
		fontFamily: 'Cooper BT',
	},
	tooltipBody: {
		fontSize: 16,
		color: '#4b5563',
		lineHeight: 24,
		marginBottom: 24,
	},
	tooltipActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	rightActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	skipText: {
		color: '#9ca3af',
		fontWeight: '600',
		fontSize: 15,
	},
	backBtn: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 14,
		backgroundColor: '#f3f4f6',
	},
	backText: {
		color: '#4b5563',
		fontWeight: '700',
		fontSize: 15,
	},
	nextBtn: {
		backgroundColor: '#f75507', // Giftyy Primary
		paddingHorizontal: 28,
		paddingVertical: 12,
		borderRadius: 14,
		shadowColor: '#f75507',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	nextText: {
		color: '#fff',
		fontWeight: '800',
		fontSize: 16,
	},
});
