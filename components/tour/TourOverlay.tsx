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
    'home_ai_chat': { title: '🎁 Meet Giftyy', body: "Type anything here — ask for gift ideas for any occasion, person, or budget. Your AI gift concierge is ready." },
    'shop_intro': { title: '🛍️ The Shop', body: 'Browse curated gifts, deals, and featured vendors. Find the perfect gift for anyone in your Circle.' },
    'recipients_intro': { title: '🫂 Your Gifting Circle', body: 'Everyone you gift regularly lives here. Add family, friends and colleagues so Giftyy can recommend personalised gifts for them.' },
    'profile_occasions': { title: '📅 Never Miss a Date', body: 'Add your own occasions so friends get automated reminders when they need to start shopping for you.' },
    'profile_circle': { title: '🫂 Your Circle', body: 'Invite friends and family so you can view their upcoming events and preferences.' },
    'profile_preferences': { title: '⭐ Your Preferences', body: 'Set your tastes. Giftyy uses this to recommend the best gifts when your Circle shops for you.' },
    'memories_intro': { title: '📼 Digital Archive', body: 'Every gift card you send or receive becomes a portal. Watch reactions and revisit your digital memories here.' },
    'tour_complete': { title: "🎉 You're All Set!", body: 'Start adding to your Giftyy Circle or drop a message to the AI.' }
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
    const tooltipTop = spaceBelow < 250
        ? Math.max(STATUS_BAR_HEIGHT + 20, cy - 20 - 210)
        : cy + ch + 16;

    const isLastStep = currentStep === 'memories_intro';
    const isFirstStep = currentStep === 'home_ai_chat';

    return (
        <Modal
            transparent
            animationType="fade"
            visible={isActive && !!currentStep}
            statusBarTranslucent
            onRequestClose={skipTour}
        >
            {/*
             * 4-panel spotlight approach:
             * The element is left UNCOVERED (transparent hole).
             * Four dark panels surround it — top, bottom, left, right.
             * The corners of the hole show the element's own background, giving a naturally
             * rounded appearance matching the pill shape of the input field.
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
        </Modal>
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
        borderRadius: 20,
        padding: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 14,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        marginBottom: 8,
    },
    tooltipBody: {
        fontSize: 14,
        color: '#555',
        lineHeight: 21,
        marginBottom: 20,
    },
    tooltipActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    skipText: {
        color: '#aaa',
        fontWeight: '600',
        fontSize: 14,
    },
    backBtn: {
        borderWidth: 1.5,
        borderColor: '#ddd',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    backText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    nextBtn: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 24,
        paddingVertical: 11,
        borderRadius: 10,
    },
    nextText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});
