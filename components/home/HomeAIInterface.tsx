import { RecommendationCard } from '@/components/home/RecommendationCard';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { normalizeFont, scale, verticalScale } from '@/utils/responsive';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import {
    callAIRecommendFunction,
    createAISession,
    getAIFeedback,
    getAISessionMessages,
    getUserAISessions,
    insertAIFeedback,
    insertAIMessage,
    insertGiftRecommendation,
    updateSessionLastActive,
    type RecommendedProduct
} from '@/lib/api/ai-sessions';
import { UpcomingOccasion } from '@/lib/hooks/useHome';
import { useAppStore } from '@/lib/store/useAppStore';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
    type StyleProp,
    type ViewStyle
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    FadeInDown,
    FadeOutDown,
    ZoomIn,
    ZoomOut
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProducts, type Product } from '@/contexts/ProductsContext';
import * as Haptics from 'expo-haptics';



type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    suggestions?: RecommendedProduct[];
    followup?: string;
    message_script?: string;
    actions?: {
        label: string;
        route: string;
        params?: any;
        variant?: 'primary' | 'secondary' | 'outline';
    }[];
    quickReplies?: string[];
    sessionState?: any;
    hasSignal?: boolean; // v4: indicate that this message provided a profile fact
};

type Props = {
    onSearch: (text: string) => void;
    recipients?: any[];
    occasions?: UpcomingOccasion[];
    products?: any[];
    initialPrompt?: string;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    scrollToTop?: number;
    refreshing?: boolean;
    onRefresh?: () => void;
};

const AnimatedView = Animated.createAnimatedComponent(View);
console.log("HELLO FROM HOME AI INTERFACE MODULE EVALUATION!");

const DEFAULT_SUGGESTIONS = [
    'Gift ideas for a close friend',
    'Gift ideas for my partner',
    'Thank you gift for a colleague',
    'Birthday gift ideas budget $50',
];

const BUDGET_PRESETS = [25, 50, 100, 250];

const SASSY_AVATAR_MESSAGES = [
    "Go ahead, tap me... I dare you 😏",
    "Psst... my pouch is stuffed. You know you wanna tap 👀",
    "Don't just stare — tap me! I've got goodies 🎁😘",
    "Feeling lucky? Tap me and find out 🍀",
    "My pouch is bursting. Tap tap tap! 🐻",
    "I don't bite. Tap me 😏",
    "Tap me already, I've been waiting ALL day 🥺",
    "Bet you can't tap me 10 times 😈",
    "Tap me — there's treasure in this pouch 💎",
    "One tap = one step closer to a surprise 😎",
    "This pouch won't open itself — tap it, bestie 💅",
    "Warning: tapping me causes extreme joy ⚠️ Tap anyway",
    "You + me + 10 taps = magic. Do it 🎉",
    "My pouch is glowing. Tap to find out why ✨",
    "Hey you! Yeah you. Tap this pouch 👉🐻",
    "I've got a secret... tap me to unlock it 🤫",
    "Roses are red, violets are blue, tap me right now 🌹",
    "I'm a piñata in disguise. Start tapping! 🪅",
    "Breaking news: adorable bear seeks tapper 📰 Tap now",
    "Better deals than your inbox. Tap and see 📬",
    "Impeccable taste lives in this pouch. Tap to peek 💁‍♀️",
    "Tap me like you mean it! No weak taps 💪",
    "Wanna see an explosion? Tap tap tap 💥",
    "Legends tap me. Be a legend 🏆",
    "I'm a treasure chest with fur. Tap to open 🧸",
    "VIP access: tap me. It's free 🎟️",
    "Spoiler alert: something awesome awaits. Tap me 🍿",
    "My therapist says I should share. So tap me! 🛋️",
    "90% fluff, 10% surprises. Tap to verify 📊",
    "My pouch refills every time. Tap again! 🧪",
    "You miss 100% of surprises you don't tap for 🏒",
    "My pouch is judging you. Tap it already 👁️",
    "🎵 Tap Me Baby One More Time 🎵",
    "I'm holding a gift for you. Tap me! 😤",
    "Boop! Or just tap me. Either works 🐽",
    "My pouch is screaming 'TAP ME!' 🗣️",
    "Fastest fingers win. Ready, set, TAP! 🏁",
    "Knock knock. Tap to let the surprise in 🚪",
    "I'm magical. Tap me and see ✨🐻",
    "Daily reminder: tap the bear 📝",
    "Curiosity rewarded here. Tap me 🐱",
    "10 taps. That's it. Tap me 😉",
    "My pouch is full of gains. Tap to see 💪🎁",
    "I'm sitting on a surprise. Tap me for it 🪑",
    "Tap me before I change my mind 😤💨",
    "Tap quietly. Or loudly. Just tap 🤫",
    "Other apps notify. I explode. Tap me 💥",
    "My pouch winked at you. Tap back 😉",
    "PRO TIP: tap me for instant serotonin 🧠💕",
    "Loading surprise... nah, just tap me 😜",
    "99 problems but you can fix one — tap me 🎒",
    "The suspense! TAP ALREADY 😩",
    "The gift gods demand it: tap me 🗿",
    "You scrolled this far. Now tap me 🤷",
    "More secrets than your group chat. Tap to spill 💬",
    "Dare accepted. Now tap me 10 times 🎯",
    "What's inside? Tap me to find out 📦",
    "Main character energy. Tap me 💫",
    "It's not a pouch, it's a portal. Tap to enter 🌀",
    "Tapping me is self-care. Tap away 🧘",
    "I'm fluffy. I'm here. Tap me ✨🐻",
    "Every tap = one happy bear. Tap me 🥹",
    "You haven't tapped yet?! Hurry up 😏",
    "Great surprises start with 10 taps. Tap me 🎖️",
    "My pouch has trust issues. Tap to earn it 🔐",
    "Tap responsibly. Side effects: pure joy 💊",
    "Please tap me. PLEASE 🥺👉👈",
    "This pouch isn't decoration. Tap it 👜",
    "Aggressively generous. Tap to experience 🎁",
    "10 taps to surprise. Countdown: tap NOW 🚀",
    "MVP pouch right here. Tap it 🏅",
    "I'm your lucky charm. Tap me 🍀",
    "Pouch inspector needed. Apply by tapping 📋",
    "Stop reading. Start tapping 👀",
    "Give me taps, I'll give you surprises 🤝",
    "Hot take: tapping me = best decision today 🔥",
    "Designer pouch. Exclusive surprises. Tap me 👛",
    "Don't leave me on read — tap me 📱",
    "New surprise just dropped. Tap to claim 🌅",
    "Between us... tap me for something incredible 🤭",
    "Not your average bear. Tap for deals 🐻‍❄️",
    "Wish-granting pouch. Tap to test 🧞",
    "I have a surprise. You haven't tapped. Fix that 🤨",
    "This pouch is fire. Tap it 🔥🐻",
    "Tap for confetti. Stay for the surprise 🎊",
    "New update available. Tap to install 📲",
    "Wrong app for swiping. Right app for tapping. Tap me 😅",
    "Fluffier than your pillow. Tap me 🐻💅",
    "The pouch is calling. Tap to answer 📞",
    "Speed round: tap me 10 times. GO 🏃💨",
    "Pouch is on fire today. Tap it 🔥🎒",
    "Secret level unlocked: TAP THE BEAR 🎮",
    "Adorable AND full of surprises. Tap me 💁🐻",
    "Tap me and I'll make it rain confetti 🌧️🎊",
    "Fortune favors the bold. Tap the bear 🗡️",
    "I always deliver. Tap me 🌋",
    "One does not simply NOT tap this bear 🧙",
    "Gift or deal? Tap me to find out 🎰",
    "Life is like this pouch. Tap me, Forrest 🍫",
    "Rule #1: tap the bear. Rule #2: TAP THE BEAR 🐻",
];

export default function HomeAIInterface({
    onSearch,
    recipients = [],
    occasions = [],
    products = [],
    initialPrompt = '',
    children,
    style,
    scrollToTop,
    refreshing = false,
    onRefresh
}: Props) {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const { bottom, top } = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { user, profile } = useAuth();
    const { t } = useTranslation();
    const firstName = profile?.first_name || user?.email?.split('@')[0] || 'friend';
    const { addRecipient } = useRecipients();
    const { products: allProducts } = useProducts();
    const { homeAiState, setHomeAiState } = useAppStore();

    const [text, setText] = useState(homeAiState?.text ?? initialPrompt);
    const [isExpanded, setIsExpanded] = useState(homeAiState?.isExpanded ?? false);
    const [loading, setLoading] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [showMentions, setShowMentions] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(homeAiState?.sessionId ?? null);
    const [sessionState, setSessionState] = useState<any | null>(homeAiState?.sessionState ?? null);
    const [lastRecommendations, setLastRecommendations] = useState<{ product_id: string; title: string }[]>([]);

    const defaultMessages: Message[] = [
        {
            id: '1',
            text: t('home.ai_greeting', { name: firstName }),
            sender: 'ai',
        }
    ];

    const [messages, setMessages] = useState<Message[]>(homeAiState?.messages ?? defaultMessages);
    const [feedbackHistory, setFeedbackHistory] = useState<Array<{
        productId: string;
        productName: string;
        type: 'like' | 'dislike';
        reason?: string;
        timestamp: number;
    }>>([]);

    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    // Easter egg: tappable avatar that grows, wobbles, and explodes with confetti
    const [sassyMessage, setSassyMessage] = useState(() =>
        SASSY_AVATAR_MESSAGES[Math.floor(Math.random() * SASSY_AVATAR_MESSAGES.length)]
    );
    const [surpriseDeal, setSurpriseDeal] = useState<Product | null>(null);
    const shownDealIdsRef = useRef<Set<string>>(new Set());
    const [avatarTapCount, setAvatarTapCount] = useState(0);
    const [confettiParticles, setConfettiParticles] = useState<Array<{
        key: string; x: number; y: number; color: string; rotation: number; scale: number;
        shape: 'circle' | 'rect' | 'star' | 'streamer' | 'ribbon' | 'emoji';
        emoji?: string; wave: number; index: number;
    }>>([]);
    const confettiBatchRef = useRef(0);
    const avatarScale = useSharedValue(1);
    const avatarRotate = useSharedValue(0);
    const tapInactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const MAX_TAPS = 10;
    const CONFETTI_COLORS = ['#f75507', '#14b8a6', '#FFD700', '#FF69B4', '#7C3AED', '#10B981', '#F59E0B', '#EF4444'];
    const CONFETTI_SHAPES: Array<'circle' | 'rect' | 'star' | 'streamer' | 'ribbon' | 'emoji'> = [
        'circle', 'rect', 'star', 'streamer', 'ribbon', 'circle', 'rect', 'star', 'streamer', 'emoji',
    ];
    const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '🎁', '🥳', '💥', '⭐', '🎈'];

    const pickRandomDeal = useCallback(() => {
        const saleProducts = allProducts.filter(
            p => p.isActive && p.discountPercentage > 0 && p.stockQuantity > 0
        );
        if (saleProducts.length === 0) return null;
        // Filter out already shown deals (reset if we've shown them all)
        let available = saleProducts.filter(p => !shownDealIdsRef.current.has(p.id));
        if (available.length === 0) {
            shownDealIdsRef.current.clear();
            available = saleProducts;
        }
        const pick = available[Math.floor(Math.random() * available.length)];
        shownDealIdsRef.current.add(pick.id);
        return pick;
    }, [allProducts]);

    const getHapticStyle = useCallback((tapNum: number) => {
        if (tapNum <= 3) return Haptics.ImpactFeedbackStyle.Light;
        if (tapNum <= 6) return Haptics.ImpactFeedbackStyle.Medium;
        return Haptics.ImpactFeedbackStyle.Heavy;
    }, []);

    const handleAvatarTap = useCallback(() => {
        const newCount = avatarTapCount + 1;
        setAvatarTapCount(newCount);

        // Clear any existing inactivity timer
        if (tapInactivityRef.current) {
            clearTimeout(tapInactivityRef.current);
            tapInactivityRef.current = null;
        }

        if (newCount < MAX_TAPS) {
            Haptics.impactAsync(getHapticStyle(newCount));
            const scale = 1 + (newCount * 0.06);

            // Wobble after tap 7
            if (newCount >= 7) {
                const wobbleIntensity = (newCount - 6) * 2.5; // 2.5° → 5° → 7.5°
                avatarRotate.value = withSequence(
                    withTiming(wobbleIntensity, { duration: 40 }),
                    withTiming(-wobbleIntensity, { duration: 40 }),
                    withTiming(wobbleIntensity * 0.6, { duration: 40 }),
                    withTiming(-wobbleIntensity * 0.6, { duration: 40 }),
                    withTiming(0, { duration: 60 })
                );
            }

            avatarScale.value = withSequence(
                withTiming(scale + 0.08, { duration: 80 }),
                withTiming(scale, { duration: 120 })
            );

            // Reset if no tap within 1.5s
            tapInactivityRef.current = setTimeout(() => {
                setAvatarTapCount(0);
                avatarScale.value = withTiming(1, { duration: 300 });
                avatarRotate.value = withTiming(0, { duration: 200 });
            }, 1500);
        } else {
            // Explosion! Multi-wave confetti burst
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Unique batch ID to prevent key collisions across explosions
            const batch = ++confettiBatchRef.current;

            // Wave 1: tight radial burst (instant)
            const wave1 = Array.from({ length: 30 }, (_, i) => {
                const angle = (i / 30) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
                const dist = 60 + Math.random() * 100;
                return {
                    key: `${batch}-w0-${i}`,
                    index: i,
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist - 40,
                    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                    rotation: Math.random() * 720 - 360,
                    scale: Math.random() * 0.7 + 0.5,
                    shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
                    emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
                    wave: 0,
                };
            });
            setConfettiParticles(wave1);

            // Wave 2: wider explosion (after 300ms)
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setConfettiParticles(prev => [...prev, ...Array.from({ length: 25 }, (_, i) => {
                    const angle = (i / 25) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
                    const dist = 120 + Math.random() * 140;
                    return {
                        key: `${batch}-w1-${i}`,
                        index: i,
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist - 80,
                        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                        rotation: Math.random() * 1080 - 540,
                        scale: Math.random() * 1.0 + 0.3,
                        shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
                        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
                        wave: 1,
                    };
                })]);
            }, 300);

            // Wave 3: floating shower from above (after 600ms)
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setConfettiParticles(prev => [...prev, ...Array.from({ length: 20 }, (_, i) => {
                    return {
                        key: `${batch}-w2-${i}`,
                        index: i,
                        x: (Math.random() - 0.5) * 320,
                        y: -(150 + Math.random() * 200),
                        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                        rotation: Math.random() * 540 - 270,
                        scale: Math.random() * 0.6 + 0.6,
                        shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
                        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
                        wave: 2,
                    };
                })]);
            }, 600);

            avatarRotate.value = 0;
            avatarScale.value = withSequence(
                withTiming(2.5, { duration: 200 }),
                withTiming(0, { duration: 150 }),
                withTiming(1, { duration: 400 })
            );
            // Clear confetti and show surprise deal
            setTimeout(() => {
                setConfettiParticles([]);
                setAvatarTapCount(0);
                const deal = pickRandomDeal();
                if (deal) setSurpriseDeal(deal);
            }, 2400);
            // Rotate sassy message while the deal popup is showing (user won't notice the swap)
            setTimeout(() => {
                setSassyMessage(prev => {
                    let next;
                    do {
                        next = SASSY_AVATAR_MESSAGES[Math.floor(Math.random() * SASSY_AVATAR_MESSAGES.length)];
                    } while (next === prev && SASSY_AVATAR_MESSAGES.length > 1);
                    return next;
                });
            }, 7000);
        }
    }, [avatarTapCount, avatarScale, avatarRotate, getHapticStyle, pickRandomDeal]);

    // Surprise deal popup countdown (10s auto-dismiss)
    const [dealCountdown, setDealCountdown] = useState(0);
    const dealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (surpriseDeal) {
            setDealCountdown(10);
            dealTimerRef.current = setInterval(() => {
                setDealCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(dealTimerRef.current!);
                        dealTimerRef.current = null;
                        setSurpriseDeal(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (dealTimerRef.current) {
                clearInterval(dealTimerRef.current);
                dealTimerRef.current = null;
            }
        };
    }, [surpriseDeal]);

    const dismissDeal = useCallback(() => {
        if (dealTimerRef.current) {
            clearInterval(dealTimerRef.current);
            dealTimerRef.current = null;
        }
        setSurpriseDeal(null);
    }, []);

    const animatedEasterEggStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: avatarScale.value },
            { rotate: `${avatarRotate.value}deg` },
        ],
    }));

    // Constraints State
    const [budget, setBudget] = useState<number>(100);
    const [occasion, setOccasion] = useState<string | null>(null);
    const [giftWrapRequired, setGiftWrapRequired] = useState(false);
    const [personalizationRequired, setPersonalizationRequired] = useState(false);
    const [showConstraints, setShowConstraints] = useState(false);
    const [contextRecipient, setContextRecipient] = useState<{ id: string, name: string, relationship?: string } | null>(null);

    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const expansion = useSharedValue(1); // Default to expanded since it's inline now

    // Scroll to top whenever parent requests it (e.g. on screen focus)
    useEffect(() => {
        if (scrollToTop !== undefined) {
            const t = setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: false });
            }, 50);
            return () => clearTimeout(t);
        }
    }, [scrollToTop]);

    // Positioned at the bottom of the screen
    const bottomSpacing = bottom + 12;

    // Sync local active state to persistent cache
    useEffect(() => {
        setHomeAiState({
            text,
            isExpanded,
            sessionId,
            messages,
            sessionState
        });
    }, [text, isExpanded, sessionId, messages, sessionState, setHomeAiState]);

    const [showMenu, setShowMenu] = useState(false);
    const menuScale = useSharedValue(0);
    const inputFocus = useSharedValue(0);




    const expandedHeight = SCREEN_HEIGHT * 0.7; // Fixed height relative to screen for the inline chat block

    const containerStyle = useAnimatedStyle(() => {
        return {
            height: expandedHeight,
            borderRadius: 32,
        };
    });

    const inputContainerStyle = useAnimatedStyle(() => {
        return {
            borderColor: interpolate(inputFocus.value, [0, 1], [0.1, 0.4]) > 0.2 ? GIFTYY_THEME.colors.orange : 'rgba(247, 85, 7, 0.1)',
            borderWidth: interpolate(inputFocus.value, [0, 1], [1.5, 2]),
            shadowOpacity: interpolate(inputFocus.value, [0, 1], [0.1, 0.2]),
        };
    });

    const expandedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: expansion.value,
            display: expansion.value > 0.1 ? 'flex' : 'none',
        };
    });


    const handleFocus = () => {
        setIsExpanded(true);
        inputFocus.value = withTiming(1, { duration: 300 });
        expansion.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.quad)
        });
    };

    const handleBlur = () => {
        inputFocus.value = withTiming(0, { duration: 300 });
    };

    const handleCollapse = () => {
        setIsExpanded(false);
        expansion.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.quad)
        });
        inputRef.current?.blur();
        Keyboard.dismiss();
        setShowMentions(false);
    };

    const menuStyle = useAnimatedStyle(() => {
        return {
            opacity: menuScale.value,
            transform: [
                { scale: menuScale.value },
                { translateY: interpolate(menuScale.value, [0, 1], [20, 0]) }
            ],
        };
    });

    useEffect(() => {
        if (isExpanded) {
            // Short delay to ensure view is rendered/animated before focusing
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    useEffect(() => {
        // Force focus whenever we finish loading and are still expanded
        if (!loading && isExpanded && messages.length <= 1) {
            inputRef.current?.focus();
        }
    }, [loading, isExpanded, messages.length]);

    useEffect(() => {
        if (isExpanded && user?.id) {
            loadSessions();
        }
    }, [isExpanded, user?.id]);

    const loadSessions = async () => {
        if (!user?.id) return;
        setLoadingSessions(true);
        const { data, error } = await getUserAISessions(user.id);
        if (!error && data) {
            setPastSessions(data);
        }
        setLoadingSessions(false);
    };

    const loadPastSession = async (session: any) => {
        setLoading(true);
        setSessionId(session.id);
        const { data, error } = await getAISessionMessages(session.id);
        if (!error && data) {
            const loadedMessages: Message[] = data.map((m: any) => {
                const content = m.content || '';
                let text = content;
                let metadata = null;

                // Extract metadata if present
                const match = content.match(/\[METADATA\]\n([\s\S]*?)\n\[\/METADATA\]/);
                if (match) {
                    try {
                        metadata = JSON.parse(match[1]);
                        // Remove metadata block from display text
                        text = content.replace(/\[METADATA\]\n[\s\S]*?\n\[\/METADATA\]/, '').trim();
                    } catch (e) {
                        console.warn('[FloatingAIInput] Failed to parse message metadata:', e);
                    }
                }

                return {
                    id: m.id,
                    text,
                    sender: m.role === 'assistant' ? 'ai' : 'user',
                    ...metadata // Re-inflate suggestions, followup, etc.
                };
            });

            // Re-inflate default message if empty
            if (loadedMessages.length === 0) {
                loadedMessages.push({
                    id: '1',
                    text: "Who are we celebrating today? Let's find some sparks of joy! ✨",
                    sender: 'ai',
                });
            }

            setMessages(loadedMessages);

            // Re-hydrate sessionState from the latest AI message
            const latestAiMsg = [...loadedMessages].reverse().find(m => m.sender === 'ai' && (m as any).sessionState);
            if (latestAiMsg) {
                console.log('[DEBUG] Re-hydrating sessionState from past message');
                setSessionState((latestAiMsg as any).sessionState);
            }

            // Fetch and re-hydrate feedback for this recipient to maintain memory
            if (user?.id) {
                const recipientId = session.recipient_profile_id;
                const { data: fbData } = await getAIFeedback(user.id, recipientId);
                if (fbData) {
                    setFeedbackHistory(fbData.map((f: any) => ({
                        productId: f.productId,
                        productName: '', // Optional/Unknown here
                        type: f.type,
                        reason: f.reason,
                        timestamp: Date.now()
                    })));
                }
            }

            setIsHistoryVisible(false);
            // Optionally auto-scroll to bottom after a delay
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        }
        setLoading(false);
    };

    const startNewChat = () => {
        if (pastSessions.length >= 3) {
            setMessages([{
                id: (Date.now() + 99).toString(),
                text: t('home.ai_limit_reached'),
                sender: 'ai',
            }]);
            return;
        }

        setSessionId(null);
        setSessionState(null); // Reset session state for new chat
        setLastRecommendations([]); // Clear last recs for fresh session
        setOccasion(null); // Reset occasion for fresh session
        setMessages([{
            id: '1',
            text: t('home.ai_greeting', { name: firstName }),
            sender: 'ai',
        }]);
        setContextRecipient(null);
        setFeedbackHistory([]); // Clear feedback for a fresh session
        setText('');
        setIsHistoryVisible(false);
        inputRef.current?.focus();
    };

    const handleResumeLatestChat = async () => {
        if (!user?.id) return;

        let sessions = pastSessions;
        if (sessions.length === 0) {
            setLoadingSessions(true);
            const { data, error } = await getUserAISessions(user.id);
            if (!error && data) {
                setPastSessions(data);
                sessions = data;
            }
            setLoadingSessions(false);
        }

        if (sessions && sessions.length > 0) {
            loadPastSession(sessions[0]);
        } else {
            startNewChat();
        }
    };


    const handleHistoryPress = () => {
        setIsHistoryVisible(true);
        setShowMenu(false);
    };


    const handleToggleMenu = () => {
        const isOpen = !showMenu;
        setShowMenu(isOpen);
        menuScale.value = withTiming(isOpen ? 1 : 0, { duration: 200 });
    };

    const handleNavPress = (route: string) => {
        handleToggleMenu();
        router.push(route as any);
    };

    const ThinkingDots = () => {
        const dot1 = useSharedValue(0.4);
        const dot2 = useSharedValue(0.4);
        const dot3 = useSharedValue(0.4);

        useEffect(() => {
            const animate = (val: any, delay: number) => {
                val.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
                        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.quad) })
                    ),
                    -1,
                    true
                );
            };

            const t1 = setTimeout(() => animate(dot1, 0), 0);
            const t2 = setTimeout(() => animate(dot2, 400), 400);
            const t3 = setTimeout(() => animate(dot3, 800), 800);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        }, []);

        const dotStyle = (val: any) => useAnimatedStyle(() => ({
            opacity: val.value,
            transform: [{ scale: val.value }]
        }));

        return (
            <View style={styles.thinkingDotsContainer}>
                <Animated.View style={[styles.thinkingDot, dotStyle(dot1)]} />
                <Animated.View style={[styles.thinkingDot, dotStyle(dot2)]} />
                <Animated.View style={[styles.thinkingDot, dotStyle(dot3)]} />
            </View>
        );
    };

    const handleFeedback = async (suggestion: RecommendedProduct, type: 'like' | 'dislike', reason?: string) => {
        const suggestionId = suggestion.product_id;
        const productName = suggestion.title;

        console.log(`User ${type}d suggestion ${suggestionId}${reason ? ` because: ${reason}` : ''}`);

        setFeedbackHistory(prev => {
            // Remove previous feedback for same product if any (to allow toggling/changing mind)
            const filtered = prev.filter(f => f.productId !== suggestionId);

            // Add new feedback
            return [...filtered, {
                productId: suggestionId,
                productName: productName,
                type,
                reason,
                timestamp: Date.now()
            }];
        });

        // Record feedback to database
        if (user?.id) {
            const recipientIdToUse = contextRecipient?.id;

            const { error } = await insertAIFeedback({
                userId: user.id,
                feedbackType: type,
                productId: suggestionId,
                recipientId: recipientIdToUse,
                reason: reason || undefined,
            });
            if (error) console.warn('[FloatingAIInput] Failed to save AI feedback:', error.message);
        }

        if (type === 'dislike' && reason) {
            // Auto-trigger a new search based on the feedback
            const feedbackMsg = `I don't think the ${productName} is a good fit because: ${reason}. Can you show me some other options?`;
            console.log('[DEBUG] Formulated feedback msg:', feedbackMsg);
            try {
                handleSubmit(feedbackMsg);
            } catch (err) {
                console.error('[FloatingAIInput] Crash in handleSubmit from handleFeedback:', err);
            }
        }
    };

    const pulse = useSharedValue(1);

    useEffect(() => {
        if (loading) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            pulse.value = withTiming(1);
        }
    }, [loading]);

    const animatedAvatarStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: interpolate(pulse.value, [1, 1.1], [1, 0.8])
    }));

    const getWordAtSelection = (currentText: string, cursorIndex: number) => {
        const words = currentText.split(/(\s+)/);
        let currentIndex = 0;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const nextIndex = currentIndex + word.length;
            if (cursorIndex >= currentIndex && cursorIndex <= nextIndex) {
                return { word, index: i, start: currentIndex, end: nextIndex };
            }
            currentIndex = nextIndex;
        }
        return null;
    };

    // Monitor text/selection to show/hide mentions
    useEffect(() => {
        const wordInfo = getWordAtSelection(text, selection.start);
        if (wordInfo && wordInfo.word.startsWith('@')) {
            const query = wordInfo.word.slice(1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            setMentionQuery(query);
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    }, [text, selection.start]);

    const handleTextChange = (newText: string) => {
        setText(newText);
    };

    const handleSelectionChange = (event: any) => {
        const { start, end } = event.nativeEvent.selection;
        setSelection({ start, end });
    };

    const handleMentionSelect = (recipient: any) => {
        const wordInfo = getWordAtSelection(text, selection.start);
        const name = recipient.firstName || recipient.first_name || 'Recipient';
        const lastName = recipient.lastName || recipient.last_name || '';
        const tag = '@' + name + (lastName ? ' ' + lastName : '');

        if (wordInfo && wordInfo.word.startsWith('@')) {
            const before = text.substring(0, wordInfo.start);
            const after = text.substring(wordInfo.end);
            const newText = before + tag + ' ' + after;
            setText(newText);
            // Move selection to after the inserted tag
            const newPos = before.length + tag.length + 1;
            setSelection({ start: newPos, end: newPos });
        } else {
            // Fallback: append/replace last part
            const parts = text.split(' ');
            parts[parts.length - 1] = tag;
            setText(parts.join(' ') + ' ');
        }

        setShowMentions(false);
        inputRef.current?.focus();
    };

    const filteredRecipients = useMemo(() => {
        if (!recipients) return [];
        if (!mentionQuery) return recipients;
        return recipients.filter(r => {
            const fName = (r.firstName || r.first_name || '').toLowerCase();
            const lName = (r.lastName || r.last_name || '').toLowerCase();
            return fName.includes(mentionQuery) || lName.includes(mentionQuery);
        });
    }, [recipients, mentionQuery]);

    const groupedSessions = useMemo(() => {
        let filtered = pastSessions;
        if (historySearchQuery) {
            filtered = pastSessions.filter(s =>
                s.previewText.toLowerCase().includes(historySearchQuery.toLowerCase())
            );
        }

        const today: any[] = [];
        const yesterday: any[] = [];
        const earlier: any[] = [];

        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayDate = todayDate - 86400000;

        filtered.forEach(session => {
            const date = new Date(session.last_active_at).getTime();
            if (date >= todayDate) today.push(session);
            else if (date >= yesterdayDate) yesterday.push(session);
            else earlier.push(session);
        });

        return [
            { title: 'Today', data: today },
            { title: 'Yesterday', data: yesterday },
            { title: 'Earlier', data: earlier }
        ].filter(group => group.data.length > 0);
    }, [pastSessions, historySearchQuery]);

    const renderFormattedText = (rawText: string, isInput = false, color?: string) => {
        if (!rawText) return null;

        // Clean text of any metadata blocks before rendering
        const text = rawText.replace(/\[METADATA\]\n[\s\S]*?\n\[\/METADATA\]/, '').trim();

        // 1. Get all known names from recipients and occasions
        const knownNames = Array.from(new Set([
            ...recipients.map(r => (r.firstName || r.first_name || '') + ' ' + (r.lastName || r.last_name || '')),
            ...occasions.map(o => o.recipientName || (o as any).recipient_name)
        ])).filter(name => typeof name === 'string' && name.trim().length > 0)
            .sort((a, b) => b.length - a.length); // Sort long to short

        // 2. Identify potential tags in the rawText
        // We look for @ followed by any known name
        let parts: Array<{ text: string, isTag: boolean }> = [];
        let remainingText = text; // Use the cleaned text

        while (remainingText.includes('@')) {
            const atIndex = remainingText.indexOf('@');
            // Add text before '@'
            if (atIndex > 0) {
                parts.push({ text: remainingText.substring(0, atIndex), isTag: false });
            }

            const textAfterAt = remainingText.substring(atIndex + 1);
            let matchedName = '';

            // Check if any known name starts right after the '@'
            for (const name of knownNames) {
                if (textAfterAt.startsWith(name)) {
                    matchedName = name;
                    break;
                }
            }

            if (matchedName) {
                parts.push({ text: '@' + matchedName, isTag: true });
                remainingText = remainingText.substring(atIndex + 1 + matchedName.length);
            } else {
                // If no known name matches, treat just the next word as a tag or just move on
                const nextSpace = textAfterAt.indexOf(' ');
                const word = nextSpace === -1 ? textAfterAt : textAfterAt.substring(0, nextSpace);
                parts.push({ text: '@' + word, isTag: true });
                remainingText = remainingText.substring(atIndex + 1 + word.length);
            }
        }

        // Add remaining text
        if (remainingText) {
            parts.push({ text: remainingText, isTag: false });
        }

        // 3. Render the parts
        const defaultColor = isInput ? GIFTYY_THEME.colors.text : undefined; // Let parent bubble color flow down unless input

        return parts.map((part, i) => (
            <Text
                key={i}
                style={[
                    isInput ? styles.input : null,
                    {
                        color: part.isTag ? '#000000' : (color || defaultColor),
                        fontWeight: part.isTag ? '700' : undefined,
                        fontStyle: part.isTag ? 'italic' : undefined
                    }
                ]}>
                {part.text}
            </Text>
        ));
    };

    // Helper to extract a budget from text (e.g. "$50", "50 bucks", "under 100")
    // This is a naive client-side fallback; ideally, the backend extracts this precisely.
    // Helper to extract a budget from text (e.g. "$50", "around 100", "under 100")
    const extractBudget = (input: string): number | null => {
        // Look for patterns like "under 50", "$50", "around 100", "budget of 150"
        const patterns = [
            /\bunder\s*\$?(\d+)\b/i,
            /\baround\s*\$?(\d+)\b/i,
            /\bbudget\s*(?:of|is)?\s*\$?(\d+)\b/i,
            /\$(\d+)\b/i,
            /\b(\d+)\s*(bucks|dollars)\b/i,
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
                const val = parseInt(match[1], 10);
                // Sanity check for budget values
                if (val > 0 && val < 10000) return val;
            }
        }
        return null; // Not mentioned — let the AI discover it via wizard
    };

    // Helper to extract relationship from text
    const extractRelationship = (input: string): string | null => {
        const lower = input.toLowerCase();
        const relationships: Record<string, string> = {
            'wife': 'Wife',
            'husband': 'Husband',
            'partner': 'Partner',
            'girlfriend': 'Girlfriend',
            'boyfriend': 'Boyfriend',
            'son': 'Son',
            'daughter': 'Daughter',
            'mother': 'Mother',
            'father': 'Father',
            'mom': 'Mother',
            'dad': 'Father',
            'sister': 'Sister',
            'brother': 'Brother',
            'friend': 'Friend',
            'colleague': 'Colleague',
            'boss': 'Boss',
            'grandpa': 'Grandfather',
            'grandma': 'Grandmother',
            'grandfather': 'Grandfather',
            'grandmother': 'Grandmother',
            'grandson': 'Grandson',
            'granddaughter': 'Granddaughter',
            'uncle': 'Uncle',
            'aunt': 'Aunt',
            'auntie': 'Aunt',
            'nephew': 'Nephew',
            'niece': 'Niece',
            'cousin': 'Cousin',
            'fiancé': 'Fiancé',
            'fiancée': 'Fiancée',
            'fiance': 'Fiancé',
            'fiancee': 'Fiancée',
            'teacher': 'Teacher',
            'coworker': 'Colleague'
        };

        for (const [key, val] of Object.entries(relationships)) {
            if (new RegExp(`\\b${key}\\b`, 'i').test(lower)) return val;
        }
        return null;
    };

    // Helper to extract an occasion from text
    const extractOccasion = (input: string): string | null => {
        const lower = input.toLowerCase();
        if (lower.includes('birthday')) return 'Birthday';
        if (lower.includes('anniversary')) return 'Anniversary';
        if (lower.includes('wedding')) return 'Wedding';
        if (lower.includes('christmas')) return 'Christmas';
        if (lower.includes('graduation')) return 'Graduation';
        if (lower.includes('baby')) return 'Baby Shower';
        if (lower.includes('valentine')) return 'Valentines';
        if (/\bmother'?s?\s*day\b/.test(lower) || (lower.includes('mother') && !lower.includes('grandmother'))) return 'Mothers Day';
        if (/\bfather'?s?\s*day\b/.test(lower) || (lower.includes('father') && !lower.includes('grandfather'))) return 'Fathers Day';
        if (lower.includes('ramadan')) return 'Ramadan';
        if (lower.includes('eid')) return 'Eid';
        if (lower.includes('housewarming')) return 'Housewarming';
        if (lower.includes('thank you') || lower.includes('appreciation')) return 'Thank You';
        if (lower.includes('retirement')) return 'Retirement';
        if (lower.includes('easter')) return 'Easter';
        if (lower.includes('hanukkah') || lower.includes('chanukah')) return 'Hanukkah';
        if (lower.includes('diwali')) return 'Diwali';
        if (lower.includes('new year')) return 'New Year';
        // Don't match generic words like "gift" or "present" — they're context, not occasions
        return null;
    };

    const handleSubmit = async (overrideText?: string) => {
        const searchText = overrideText || text;
        if (!searchText.trim() || loading) return;

        console.log('[DEBUG] handleSubmit: START', { searchText });

        const userMsg: Message = {
            id: Date.now().toString(),
            text: searchText.trim(),
            sender: 'user',
        };

        setMessages(prev => [...prev, userMsg]);
        setText('');
        setLoading(true);

        setShowConstraints(false); // Hide constraints when sending

        // Create session on first user message if not exists
        let currentSessionId = sessionId;
        if (!currentSessionId && user?.id) {
            console.log('[DEBUG] Creating new AI session...');
            const { data, error: sessionError } = await createAISession({
                userId: user.id,
                title: searchText.trim().slice(0, 200) || 'Giftyy Chat',
            });
            if (!sessionError && data?.id) {
                currentSessionId = data.id;
                setSessionId(currentSessionId);
                setOccasion(null); // Fresh session — clear persisted occasion
                setSessionState(null); // Fresh session — clear stale session state
                console.log('[DEBUG] Session created:', currentSessionId);
                // Reload sessions to update the count
                loadSessions();
            } else if (sessionError) {
                console.warn('[FloatingAIInput] Failed to create AI session:', sessionError.message, sessionError.code);
                if (sessionError.code === 'SESSION_LIMIT_REACHED') {
                    const limitMsg: Message = {
                        id: (Date.now() + 5).toString(),
                        text: sessionError.message,
                        sender: 'ai',
                    };
                    setMessages(prev => [...prev, limitMsg]);
                    setLoading(false);
                    return;
                }
            }
        }

        // Record user message
        if (currentSessionId) {
            const { error: msgError } = await insertAIMessage(currentSessionId, 'user', searchText.trim());
            if (msgError) console.warn('[FloatingAIInput] Failed to save user message:', msgError.message);
        }

        try {
            // Check for @mentions to inject context
            let mentionedRecipientId: string | null = null;
            let mentionedRecipientName: string | null = null;
            let mentionedRecipientRelationship: string | null = null;
            const sortedRecipients = [...recipients].sort((a, b) => b.firstName.length - a.firstName.length);
            // 1. Try exact matches on original first names
            for (const recipient of sortedRecipients) {
                if (searchText.toLowerCase().includes('@' + recipient.firstName.toLowerCase())) {
                    mentionedRecipientId = recipient.actualProfileId || recipient.profileId;
                    mentionedRecipientName = recipient.firstName;
                    mentionedRecipientRelationship = recipient.relationship;
                    break;
                }
            }

            // 2. Fallback to extracting the \w+ tag and matching without spaces
            if (!mentionedRecipientId) {
                const tagRegex = /@(\w+)/g;
                let match;
                while ((match = tagRegex.exec(searchText)) !== null) {
                    const name = match[1].toLowerCase();
                    const recipient = recipients.find(r =>
                        r.firstName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === name
                    );
                    if (recipient) {
                        mentionedRecipientId = recipient.actualProfileId || recipient.profileId;
                        mentionedRecipientName = recipient.firstName;
                        mentionedRecipientRelationship = recipient.relationship;
                        break;
                    }
                }
            }

            // 3. Fallback to basic case-insensitive word matching without @ symbol
            if (!mentionedRecipientId) {
                for (const recipient of sortedRecipients) {
                    const nameRegex = new RegExp(`\\b${recipient.firstName.trim()}\\b`, 'i');
                    if (nameRegex.test(searchText)) {
                        mentionedRecipientId = recipient.actualProfileId || recipient.profileId;
                        mentionedRecipientName = recipient.firstName;
                        mentionedRecipientRelationship = recipient.relationship;
                        break;
                    }
                }
            }

            // Restore from context if user didn't mention anyone this time
            let finalRecipientId = mentionedRecipientId;
            let finalRecipientName = mentionedRecipientName;
            let finalRecipientRelationship = mentionedRecipientRelationship;

            // Search for relationship if no @mention was found
            const extractedRel = extractRelationship(searchText);
            if (!finalRecipientId && extractedRel) {
                finalRecipientRelationship = extractedRel;
                console.log(`[DEBUG] Extracted relationship from text: ${extractedRel}`);
            }

            // Detect if the user is switching to a different recipient
            const isNewRecipient = (extractedRel || mentionedRecipientId) &&
                contextRecipient &&
                (extractedRel !== contextRecipient.relationship || mentionedRecipientId !== contextRecipient.id);

            if (isNewRecipient) {
                console.log(`[DEBUG] Recipient changed — clearing occasion & session state`);
                setOccasion(null);
                setSessionState(null);
            }

            if (finalRecipientId && finalRecipientName) {
                console.log(`[DEBUG] Found mention: ${finalRecipientName} (${finalRecipientId})`);
                setContextRecipient({
                    id: finalRecipientId,
                    name: finalRecipientName,
                    relationship: finalRecipientRelationship || undefined
                });
            } else if (finalRecipientRelationship && !finalRecipientId) {
                // If we found a relationship but no specific person yet
                // We keep it in context
                console.log(`[DEBUG] Found relationship context: ${finalRecipientRelationship}`);
                setContextRecipient({
                    id: 'temp_rel', // marker for relationship-only context
                    name: finalRecipientRelationship,
                    relationship: finalRecipientRelationship
                });
                // We don't set finalRecipientId because we don't have a profile yet
            } else if (contextRecipient) {
                // Restore from context
                finalRecipientId = contextRecipient.id === 'temp_rel' ? null : contextRecipient.id;
                finalRecipientName = (contextRecipient.id === 'temp_rel' && !finalRecipientName) ? null : (finalRecipientName || contextRecipient.name);
                finalRecipientRelationship = finalRecipientRelationship || contextRecipient.relationship || null;
                console.log(`[DEBUG] Using contextual recipient: ${finalRecipientRelationship || finalRecipientName}`);
            } else {
                console.log('[DEBUG] No recipient mentioned or found in context.');
            }

            console.log('[DEBUG] Cleaning text for occasion extraction...');
            let textForOccasion = searchText;
            // Use both name and relationship for cleaning if available
            const cleanTerms = [finalRecipientName, finalRecipientRelationship].filter(Boolean) as string[];
            for (const term of cleanTerms) {
                const termRegex = new RegExp(`\\b${term}\\b`, 'ig');
                textForOccasion = textForOccasion.replace(termRegex, '');
            }
            textForOccasion = textForOccasion.replace(/@\w+/g, '');

            console.log('[DEBUG] Extracting budget/occasion...');
            const reqBudget = extractBudget(searchText); // null if not explicitly mentioned
            if (reqBudget !== null && reqBudget !== budget) {
                setBudget(reqBudget);
            }
            const extractedOccasion = extractOccasion(textForOccasion);
            if (extractedOccasion) {
                setOccasion(extractedOccasion); // Persist for future messages
            }
            // If recipient changed, don't carry over the old occasion (React state update is async)
            const persistedOccasion = isNewRecipient ? null : occasion;
            const reqOccasion = extractedOccasion || persistedOccasion;
            console.log('[DEBUG] Extracted:', { reqBudget, reqOccasion, extractedOccasion, persistedOccasion: occasion });

            const historyToSend = [
                ...messages.filter(m => m.id !== '1'),
                userMsg
            ].map(m => ({
                role: m.sender === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));

            console.log('[DEBUG] Calling AI Recommend Function with params:', {
                recipientProfileId: finalRecipientId,
                recipientName: (finalRecipientId === 'temp_rel' || !finalRecipientId) ? null : finalRecipientName,
                recipientRelationship: finalRecipientRelationship,
                occasion: reqOccasion,
                budget: reqBudget
            });

            const { data: recommendationsData, error } = await callAIRecommendFunction({
                recipientProfileId: finalRecipientId || undefined,
                recipientName: (finalRecipientId === 'temp_rel' || !finalRecipientId) ? undefined : (finalRecipientName || undefined),
                recipientRelationship: finalRecipientRelationship || undefined,
                budget: reqBudget ?? undefined, // Only send if user explicitly mentioned a budget
                occasion: reqOccasion || undefined,
                freeText: searchText,
                chatHistory: historyToSend,
                feedbackHistory: feedbackHistory,
                lastRecommendations: lastRecommendations,
                constraints: {
                    gift_wrap_required: giftWrapRequired,
                    personalization_required: personalizationRequired
                },
                sessionState: sessionState // Pass current v4 session state
            });

            console.log('[DEBUG] AI Recommend Function returned:', {
                hasData: !!recommendationsData,
                error: error?.message,
                recCount: recommendationsData?.recommendations?.length,
                questionCount: recommendationsData?.clarifying_questions?.length
            });

            if (error || !recommendationsData) {
                throw new Error(error?.message || 'Failed to get recommendations from edge function');
            }

            // Sync v4 session state from response
            if (recommendationsData.sessionState) {
                console.log('[DEBUG] Received new sessionState. Phase:', recommendationsData.sessionState.phase);
                setSessionState(recommendationsData.sessionState);
            }

            // Check if this message provided any signals (hints)
            const hasSignals = recommendationsData.extracted_profile_hints &&
                Object.values(recommendationsData.extracted_profile_hints).some(v => v !== undefined && v !== null);

            if (hasSignals) {
                console.log('[DEBUG] Profile signals detected in user message');
                // Mark the last user message as having a signal
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastUserMsgIndex = newMsgs.findLastIndex(m => m.sender === 'user');
                    if (lastUserMsgIndex !== -1) {
                        newMsgs[lastUserMsgIndex] = { ...newMsgs[lastUserMsgIndex], hasSignal: true };
                    }
                    return newMsgs;
                });
            }

            let aiMsg: Message;

            const hasQuestions = recommendationsData.clarifying_questions && recommendationsData.clarifying_questions.length > 0;
            const hasRecs = recommendationsData.recommendations && recommendationsData.recommendations.length > 0;

            const fallbackQuestion = hasQuestions ? recommendationsData.clarifying_questions[0] : '';
            const mainText = (recommendationsData.chat_followup || fallbackQuestion || '').trim() || t('home.ai_refinement_fallback');

            aiMsg = {
                id: (Date.now() + 2).toString(),
                text: mainText,
                sender: 'ai',
                suggestions: hasRecs ? recommendationsData.recommendations : undefined,
                message_script: undefined,
                quickReplies: recommendationsData.quick_replies
            };

            if (recommendationsData.cautions && recommendationsData.cautions.length > 0) {
                aiMsg.text += `\n\n⚠️ Caution: ${recommendationsData.cautions.join(' ')}`;
            }

            // Track last shown recommendations for product follow-up detection
            if (hasRecs) {
                setLastRecommendations(
                    recommendationsData.recommendations.map((r: any) => ({
                        product_id: r.product_id,
                        title: r.title,
                    }))
                );
            }

            setMessages(prev => [...prev, aiMsg]);

            // Record assistant message and recommendations
            if (currentSessionId && user?.id) {
                // Save with metadata for session persistence
                const metadata = {
                    suggestions: aiMsg.suggestions, // Persist suggestions for history view
                    followup: aiMsg.followup,
                    message_script: aiMsg.message_script,
                    quickReplies: aiMsg.quickReplies,
                    actions: aiMsg.actions,
                    sessionState: recommendationsData.sessionState // Save state in metadata for re-hydration
                };
                const { error: msgError } = await insertAIMessage(currentSessionId, 'assistant', aiMsg.text, metadata);
                if (msgError) console.warn('[FloatingAIInput] Failed to save assistant message:', msgError.message);

                if (recommendationsData.recommendations) {
                    for (const suggestion of recommendationsData.recommendations) {
                        if (suggestion.product_id) {
                            const { error: recErr } = await insertGiftRecommendation({
                                userId: user.id,
                                productId: suggestion.product_id,
                                recipientId: finalRecipientId || null,
                                status: 'suggested',
                            });
                            if (recErr) console.warn('[FloatingAIInput] Failed to save gift recommendation:', recErr.message);
                        }
                    }
                }

                await updateSessionLastActive(currentSessionId);
            }
        } catch (err: any) {
            console.error('[FloatingAIInput] Error in handleSubmit:', err);

            const errorMsg: Message = {
                id: (Date.now() + 4).toString(),
                text: t('home.ai_error_fallback'),
                sender: 'ai',
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionPress = async (suggestion: RecommendedProduct) => {
        // Record implicit "like" feedback when user taps a suggestion
        if (user?.id && suggestion.product_id) {
            // Update local state immediately for next request memory
            setFeedbackHistory(prev => {
                const filtered = prev.filter(f => f.productId !== suggestion.product_id);
                return [...filtered, {
                    productId: suggestion.product_id,
                    productName: suggestion.title,
                    type: 'like',
                    timestamp: Date.now()
                }];
            });

            const { error } = await insertAIFeedback({
                userId: user.id,
                feedbackType: 'like',
                productId: suggestion.product_id,
                recipientId: contextRecipient?.id
            });
            if (error) console.warn('[FloatingAIInput] Failed to save feedback on tap:', error.message);
        }

        if (suggestion.product_id) {
            handleCollapse();
            router.push({ pathname: '/(buyer)/(tabs)/product/[id]', params: { id: suggestion.product_id, returnTo: pathname } } as any);
        } else {
            // General suggestion or no product ID
            onSearch(suggestion.title);
            handleCollapse();
        }
    };

    useEffect(() => {
        if (isExpanded) {
            const timer = setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [messages.length, loading, isExpanded]);

    return (
        <View style={[styles.container, style]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[styles.contentContainer, { flex: 1 }]}>
                    {/* Header & Main Chat Area */}
                    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <View style={[styles.expandedMain, { paddingTop: top }]}>
                            <ScrollView
                                ref={scrollRef}
                                style={[styles.chatArea, { flex: 1 }]}
                                contentContainerStyle={[
                                    styles.chatContent,
                                    { flexGrow: 1, justifyContent: messages.length > 1 ? 'flex-end' : 'flex-start' }
                                ]}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                refreshControl={
                                    onRefresh ? (
                                        <RefreshControl
                                            refreshing={refreshing}
                                            onRefresh={onRefresh}
                                            tintColor={GIFTYY_THEME.colors.primary}
                                            colors={[GIFTYY_THEME.colors.primary]}
                                            progressViewOffset={top + 20}
                                        />
                                    ) : undefined
                                }
                            >
                                {/* Clear header when in chat mode; Dashboard children handle their own padding */}
                                {messages.length > 1 && <View style={{ height: top + 40 }} />}

                                {/* Profile Score Progress Bar */}
                                {messages.length > 1 && sessionState?.profileScore !== undefined && (
                                    <View style={styles.profileScoreContainer}>
                                        <View style={styles.profileScoreTrack}>
                                            <View 
                                                style={[
                                                    styles.profileScoreFill, 
                                                    { width: `${(sessionState.profileScore * 100).toFixed(0)}%` as any }
                                                ]} 
                                            />
                                        </View>
                                        <Text style={styles.profileScoreText}>
                                            {sessionState.profileScore >= 0.85 ? 'Perfect match ready! 🎯' : 
                                            sessionState.profileScore >= 0.55 ? 'Getting close... ✨' : 
                                            'Learning about them... 🧠'}
                                        </Text>
                                    </View>
                                )}

                                {/* Inline Home Page Content rendered here! */}
                                {messages.length <= 1 && (
                                    <View>
                                        {messages.map((msg, index) => {
                                            // Simple greeting check: the very first AI message when starting a conversation
                                            const isInitialGreeting = index === 0 &&
                                                msg.sender === 'ai' &&
                                                messages.length === 1;

                                            if (isInitialGreeting) {
                                                return (
                                                    <View key={msg.id} style={[styles.initialGreetingContainer, { overflow: 'visible' }]}>
                                                        <View style={{ alignItems: 'center', overflow: 'visible' }}>
                                                            <Pressable onPress={handleAvatarTap} style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                                <Animated.View style={[styles.initialGreetingAvatarWrapper, animatedEasterEggStyle]}>
                                                                    <Image
                                                                        source={require('@/assets/images/giftyy.png')}
                                                                        style={styles.initialGreetingAvatar}
                                                                        resizeMode="cover"
                                                                    />
                                                                </Animated.View>
                                                            </Pressable>
                                                            {confettiParticles.length > 0 && (
                                                                <View style={styles.confettiContainer} pointerEvents="none">
                                                                    {confettiParticles.map((p) => {
                                                                        const entryDelay = p.wave * 250 + p.index * 12;

                                                                        if (p.shape === 'emoji') {
                                                                            return (
                                                                                <Animated.View
                                                                                    key={p.key}
                                                                                    entering={ZoomIn.delay(entryDelay).duration(300)}
                                                                                    exiting={FadeOutDown.duration(800)}
                                                                                    style={[
                                                                                        styles.confettiEmoji,
                                                                                        {
                                                                                            transform: [
                                                                                                { translateX: p.x },
                                                                                                { translateY: p.y },
                                                                                                { rotate: `${p.rotation}deg` },
                                                                                                { scale: p.scale },
                                                                                            ],
                                                                                        },
                                                                                    ]}
                                                                                >
                                                                                    <Text style={{ fontSize: GIFTYY_THEME.typography.sizes.md }}>{p.emoji}</Text>
                                                                                </Animated.View>
                                                                            );
                                                                        }

                                                                        const shapeStyle =
                                                                            p.shape === 'circle' ? styles.confettiCircle :
                                                                            p.shape === 'star' ? styles.confettiStar :
                                                                            p.shape === 'streamer' ? styles.confettiStreamer :
                                                                            p.shape === 'ribbon' ? styles.confettiRibbon :
                                                                            styles.confettiRect;

                                                                        return (
                                                                            <Animated.View
                                                                                key={p.key}
                                                                                entering={ZoomIn.delay(entryDelay).duration(250)}
                                                                                exiting={FadeOutDown.duration(800)}
                                                                                style={[
                                                                                    shapeStyle,
                                                                                    {
                                                                                        backgroundColor: p.color,
                                                                                        transform: [
                                                                                            { translateX: p.x },
                                                                                            { translateY: p.y },
                                                                                            { rotate: `${p.rotation}deg` },
                                                                                            { scale: p.scale },
                                                                                        ],
                                                                                    },
                                                                                ]}
                                                                            />
                                                                        );
                                                                    })}
                                                                </View>
                                                            )}
                                                        </View>


                                                        <Text
                                                            style={styles.initialGreetingTitle}
                                                            numberOfLines={1}
                                                            adjustsFontSizeToFit
                                                        >
                                                            Hi <Text style={{ color: '#000' }}>{firstName}</Text>, I'm <Text style={{ color: GIFTYY_THEME.colors.orange, fontWeight: 'bold' }}>Giftyy</Text>!
                                                        </Text>
                                                        <Text style={styles.initialGreetingText}>
                                                            {(() => {
                                                                try {
                                                                    return renderFormattedText(sassyMessage, false, GIFTYY_THEME.colors.gray500);
                                                                } catch (err) {
                                                                    return msg.text;
                                                                }
                                                            })()}
                                                        </Text>
                                                    </View>
                                                );
                                            }
                                            return null;
                                        })}
                                        <View>
                                            {children}
                                        </View>
                                    </View>
                                )}

                                {messages.length > 1 && messages.map((msg, index) => (
                                    <View key={msg.id} style={[
                                        styles.messageContainer,
                                        msg.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
                                    ]}>
                                        <View style={styles.aiMessageRow}>
                                            {msg.sender === 'ai' && (
                                                <View style={styles.aiAvatarContainer}>
                                                    <Image
                                                        source={require('@/assets/images/giftyy.png')}
                                                        style={styles.messageAvatar}
                                                        resizeMode="cover"
                                                    />
                                                </View>
                                            )}
                                            <View style={styles.bubbleWrapper}>
                                                <View style={[
                                                    styles.messageBubble,
                                                    msg.sender === 'user' ? styles.userBubble : styles.aiBubble
                                                ]}>
                                                    <Text style={[
                                                        styles.messageText,
                                                        msg.sender === 'user' ? styles.userMessageText : styles.aiMessageText
                                                    ]}>
                                                        {(() => {
                                                            try {
                                                                const textColor = msg.sender === 'user' ? '#FFFFFF' : GIFTYY_THEME.colors.text;
                                                                return renderFormattedText(msg.text, false, textColor);
                                                            } catch (err) {
                                                                console.error('[FloatingAIInput] error rendering text:', err);
                                                                return msg.text;
                                                            }
                                                        })()}
                                                    </Text>

                                                    {/* Signal Badge for User Messages */}
                                                    {msg.sender === 'user' && msg.hasSignal && (
                                                        <View style={styles.signalBadge}>
                                                            <IconSymbol name="timer" size={12} color="#FFFFFF" />
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        {msg.suggestions && msg.suggestions.length > 0 && (
                                            <View style={styles.recommendationGroup}>
                                                <View style={styles.recommendationHeader}>
                                                    <IconSymbol name="sparkles" size={14} color={GIFTYY_THEME.colors.orange} />
                                                    <Text style={styles.recommendationHeaderText}>Handpicked for you</Text>
                                                </View>

                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    style={styles.recommendationCarousel}
                                                    contentContainerStyle={styles.recommendationScrollContent}
                                                    decelerationRate="fast"
                                                    snapToInterval={SCREEN_WIDTH * 0.65 + 12}
                                                    disableIntervalMomentum={true}
                                                    nestedScrollEnabled={true}
                                                >
                                                    {msg.suggestions.map((s, idx) => {
                                                        try {
                                                            const product = products.find(p => p.id === s.product_id);
                                                            return (
                                                                <RecommendationCard
                                                                    key={idx}
                                                                    suggestion={s}
                                                                    product={product}
                                                                    onPress={handleSuggestionPress}
                                                                    onFeedback={handleFeedback}
                                                                />
                                                            );
                                                        } catch (err) {
                                                            console.error(`[FloatingAIInput] error rendering RecommendationCard for msg ${msg.id}:`, err);
                                                            return <Text key={idx} style={{ color: 'red' }}>Error rendering card</Text>;
                                                        }
                                                    })}
                                                </ScrollView>

                                                {msg.followup && (
                                                    <View style={styles.followupContainer}>
                                                        <View style={[styles.messageBubble, styles.aiBubble, styles.followupBubble]}>
                                                            <Text style={[styles.messageText, styles.aiMessageText]}>
                                                                {msg.followup}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {msg.actions && msg.actions.length > 0 && (
                                            <View style={{ marginTop: GIFTYY_THEME.spacing.md, marginLeft: scale(46) }}>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={{ gap: GIFTYY_THEME.spacing.sm, paddingRight: GIFTYY_THEME.spacing['3xl'], alignItems: 'center' }}
                                                    keyboardShouldPersistTaps="handled"
                                                    scrollEnabled={true}
                                                >
                                                    {msg.actions.map((action, idx) => (
                                                        <Pressable
                                                            key={idx}
                                                            style={({ pressed }) => [
                                                                styles.actionButton,
                                                                styles.actionButtonOutline,
                                                                pressed && styles.actionButtonPressed
                                                            ]}
                                                            onPress={() => {
                                                                handleCollapse();
                                                                router.push({
                                                                    pathname: action.route as any,
                                                                    params: action.params
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.actionButtonText}>{action.label}</Text>
                                                        </Pressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Quick Replies — only show on the latest AI message */}
                                        {msg.sender === 'ai' && msg.quickReplies && msg.quickReplies.length > 0 && index === messages.length - 1 && !loading && (
                                            <View style={styles.quickRepliesContainer}>
                                                <View style={styles.quickRepliesContent}>
                                                    {msg.quickReplies.map((reply, idx) => (
                                                        <Pressable
                                                            key={idx}
                                                            style={({ pressed }) => [
                                                                styles.quickReplyButton,
                                                                pressed && styles.quickReplyButtonPressed
                                                            ]}
                                                            onPress={() => handleSubmit(reply)}
                                                        >
                                                            <Text style={styles.quickReplyText}>{reply}</Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ))}

                                {loading && (
                                    <View style={styles.aiMessageContainer}>
                                        <View style={styles.aiMessageRow}>
                                            <View style={styles.aiAvatarContainer}>
                                                <Animated.Image
                                                    source={require('@/assets/images/giftyy.png')}
                                                    style={[styles.messageAvatar, animatedAvatarStyle]}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                            <View style={styles.bubbleWrapper}>
                                                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                                                    <ThinkingDots />
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Plus Menu Overlay */}
                    {showMenu && (
                        <Pressable
                            style={StyleSheet.absoluteFillObject}
                            onPress={handleToggleMenu}
                        />
                    )}

                    {/* Navigation Menu (Plus Button) */}
                    {showMenu && (
                        <View style={styles.actionMenu}>
                            {(messages.length > 1 || isHistoryVisible) ? (
                                <Pressable
                                    style={styles.actionMenuItem}
                                    onPress={() => {
                                        handleToggleMenu();
                                        startNewChat();
                                    }}
                                >
                                    <IconSymbol name="house.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                    <Text style={styles.actionMenuText}>Home</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={styles.actionMenuItem}
                                    onPress={() => {
                                        handleToggleMenu();
                                        handleResumeLatestChat();
                                    }}
                                >
                                    <IconSymbol name="message.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                    <Text style={styles.actionMenuText}>Chat</Text>
                                </Pressable>
                            )}
                            <Pressable style={styles.actionMenuItem} onPress={() => {
                                console.log('Navigating to Shop');
                                handleNavPress('/(buyer)/(tabs)/shop');
                            }}>
                                <IconSymbol name="bag.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                <Text style={styles.actionMenuText}>Shop</Text>
                            </Pressable>
                            <Pressable style={styles.actionMenuItem} onPress={() => {
                                console.log('Navigating to Giftyy Circle');
                                handleNavPress('/(buyer)/(tabs)/recipients');
                            }}>
                                <IconSymbol name="person.2.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                <Text style={styles.actionMenuText}>Giftyy Circle</Text>
                            </Pressable>
                            <Pressable style={styles.actionMenuItem} onPress={() => {
                                console.log('Navigating to Memories');
                                handleNavPress('/(buyer)/(tabs)/memory');
                            }}>
                                <IconSymbol name="play.rectangle.on.rectangle.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                <Text style={styles.actionMenuText}>Memories</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Floating History Icon (Only on Chat Screen) */}
                    {messages.length > 1 && !showMenu && (
                        <Pressable
                            style={[styles.floatingHistoryButton, { bottom: Math.max(bottom, 24) + 80 }]}
                            onPress={handleHistoryPress}
                        >
                            <IconSymbol name="clock.fill" size={24} color="#FFFFFF" />
                        </Pressable>
                    )}

                    <View style={[styles.inputWrapper, { paddingBottom: Math.max(bottom, 12) }]}>
                        {/* Mentions Dropdown */}
                        {showMentions && filteredRecipients.length > 0 && (
                            <AnimatedView 
                                entering={FadeInDown.duration(200)}
                                exiting={FadeOutDown.duration(150)}
                                style={styles.mentionDropdown}
                            >
                                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                                    {filteredRecipients.map((r, idx) => (
                                        <Pressable
                                            key={r.id || idx}
                                            onPress={() => handleMentionSelect(r)}
                                            style={({ pressed }) => [
                                                styles.mentionItem,
                                                pressed && styles.mentionItemPressed,
                                                idx < filteredRecipients.length - 1 && styles.mentionItemBorder
                                            ]}
                                        >
                                            <View style={styles.mentionAvatar}>
                                                <Text style={styles.mentionAvatarText}>
                                                    {(r.firstName || r.first_name || 'U')[0].toUpperCase()}
                                                    {(r.lastName || r.last_name || '')[0]?.toUpperCase() || ''}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mentionName}>{r.firstName || r.first_name} {r.lastName || r.last_name || ''}</Text>
                                                {(r.relationship || r.sender_relationship) && (
                                                    <Text style={styles.mentionSubtext}>{r.relationship || r.sender_relationship}</Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </AnimatedView>
                        )}

                        <TourAnchor step="home_burger_menu">
                            <Pressable style={styles.plusButton} onPress={handleToggleMenu}>
                                <IconSymbol name="line.3.horizontal" size={24} color={GIFTYY_THEME.colors.text} />
                            </Pressable>
                        </TourAnchor>
                        <Animated.View style={[styles.textInputContainer, inputContainerStyle]}>
                            <TourAnchor step="home_tagging" style={StyleSheet.absoluteFillObject} />
                            <TourAnchor step="home_ai_chat" style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <TextInput
                                    ref={inputRef}
                                    style={[styles.input, { maxHeight: 100 }]}
                                    placeholder="Ask Giftyy (Use @ to tag)"
                                    placeholderTextColor="#94A3B8"
                                    value={text}
                                    onChangeText={handleTextChange}
                                    onSelectionChange={handleSelectionChange}
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                    multiline
                                    onSubmitEditing={() => handleSubmit()}
                                    returnKeyType="send"
                                />
                                <Pressable 
                                    style={({ pressed }) => [
                                        styles.sendButton,
                                        (loading || !text.trim()) && styles.sendButtonDisabled,
                                        pressed && !loading && text.trim() && styles.sendButtonPressed
                                    ]}
                                    onPress={() => handleSubmit()}
                                    disabled={loading || !text.trim()}
                                >
                                    <IconSymbol name="paperplane.fill" size={18} color="#FFF" />
                                </Pressable>
                            </TourAnchor>
                        </Animated.View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* History Modal Popup */}
            <Modal
                visible={isHistoryVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsHistoryVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {Platform.OS === 'ios' ? (
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={styles.modalBackdropFallback} />
                    )}
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsHistoryVisible(false)}
                    />
                    
                    <AnimatedView 
                        entering={ZoomIn.duration(300).springify()}
                        style={styles.historyPopupContainer}
                    >
                        <View style={styles.historyHeader}>
                            <View>
                                <Text style={styles.historyTitleText}>Previous Chats</Text>
                                <Text style={styles.historySubtitleText}>
                                    {pastSessions.length} active sessions
                                </Text>
                            </View>
                            <Pressable
                                style={styles.historyCloseCircle}
                                onPress={() => setIsHistoryVisible(false)}
                                hitSlop={15}
                            >
                                <IconSymbol name="xmark" size={18} color={GIFTYY_THEME.colors.gray600} />
                            </Pressable>
                        </View>

                        <View style={{ marginBottom: GIFTYY_THEME.spacing.xl }}>
                            <Pressable 
                                onPress={() => {
                                    startNewChat();
                                    setIsHistoryVisible(false);
                                }}
                                disabled={pastSessions.length >= 3}
                            >
                                <LinearGradient
                                    colors={[GIFTYY_THEME.colors.orange, '#FF8C42']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[
                                        styles.startChatGradient,
                                        pastSessions.length >= 3 && { opacity: 0.6 }
                                    ]}
                                >
                                    <IconSymbol name="plus.circle.fill" size={20} color="#FFF" />
                                    <Text style={styles.startChatGradientText}>Start New Chat</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {loadingSessions ? (
                            <View style={styles.historyLoadingBox}>
                                <ActivityIndicator color={GIFTYY_THEME.colors.primary} size="large" />
                            </View>
                        ) : pastSessions.length === 0 ? (
                            <View style={styles.emptyHistoryState}>
                                <View style={styles.emptyHistoryIconOuter}>
                                    <IconSymbol name="message.badge.filled.fill" size={48} color={GIFTYY_THEME.colors.gray300} />
                                </View>
                                <Text style={styles.emptyHistoryTitle}>No chats yet</Text>
                                <Text style={styles.emptyHistoryBody}>Your gifting conversations will appear here.</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.historySearchContainer}>
                                    <IconSymbol name="magnifyingglass" size={18} color={GIFTYY_THEME.colors.gray400} />
                                    <TextInput
                                        style={styles.historySearchInput}
                                        placeholder="Search conversations..."
                                        placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                        value={historySearchQuery}
                                        onChangeText={setHistorySearchQuery}
                                    />
                                    {historySearchQuery.length > 0 && (
                                        <Pressable onPress={() => setHistorySearchQuery('')} hitSlop={10}>
                                            <IconSymbol name="xmark.circle.fill" size={18} color={GIFTYY_THEME.colors.gray300} />
                                        </Pressable>
                                    )}
                                </View>

                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: GIFTYY_THEME.spacing.sm }}
                                >
                                    {groupedSessions.length === 0 ? (
                                        <View style={styles.historyNoResults}>
                                            <Text style={styles.historyNoResultsText}>
                                                Nothing found for your search
                                            </Text>
                                        </View>
                                    ) : groupedSessions.map((group) => (
                                        <View key={group.title} style={{ marginBottom: GIFTYY_THEME.spacing['3xl'] }}>
                                            <Text style={styles.historyGroupTitle}>{group.title}</Text>
                                            {group.data.map((session: any) => (
                                                <Pressable
                                                    key={session.id}
                                                    onPress={() => {
                                                        loadPastSession(session);
                                                        setIsHistoryVisible(false);
                                                    }}
                                                    style={({ pressed }) => [
                                                        styles.historyItemCard,
                                                        pressed && styles.historyItemCardPressed
                                                    ]}
                                                >
                                                    <View style={styles.historyItemIconBox}>
                                                        <IconSymbol name="sparkles" size={16} color={GIFTYY_THEME.colors.orange} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.historyItemPreview} numberOfLines={1}>
                                                            {session.previewText}
                                                        </Text>
                                                        <Text style={styles.historyItemMetaText}>
                                                            {new Date(session.last_active_at).toLocaleDateString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </Text>
                                                    </View>
                                                    <IconSymbol name="chevron.right" size={14} color={GIFTYY_THEME.colors.gray300} />
                                                </Pressable>
                                            ))}
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </AnimatedView>
                </View>
            </Modal>
            {/* Surprise Deal Popup Modal */}
            <Modal
                visible={!!surpriseDeal}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={dismissDeal}
            >
                <View style={styles.surpriseModalOverlay}>
                    <Animated.View entering={ZoomIn.duration(300)} style={styles.surpriseModalCard}>
                        {/* Countdown timer ring */}
                        <View style={styles.surpriseTimerBadge}>
                            <Text style={styles.surpriseTimerText}>{dealCountdown}s</Text>
                        </View>

                        {/* Close button */}
                        <Pressable onPress={dismissDeal} hitSlop={12} style={styles.surpriseCloseBtn}>
                            <Text style={styles.surpriseCloseBtnText}>✕</Text>
                        </Pressable>

                        {/* Header */}
                        <Text style={styles.surpriseTitle}>🎉 Surprise Deal!</Text>
                        <Text style={styles.surpriseSubtitle}>You unlocked a hidden deal</Text>

                        {/* Product image */}
                        {surpriseDeal?.imageUrl && (
                            <Image
                                source={{ uri: (() => {
                                    try {
                                        const parsed = JSON.parse(surpriseDeal.imageUrl!);
                                        return Array.isArray(parsed) ? parsed[0] : surpriseDeal.imageUrl;
                                    } catch { return surpriseDeal.imageUrl; }
                                })() }}
                                style={styles.surpriseProductImage}
                                resizeMode="cover"
                            />
                        )}

                        {/* Product info */}
                        <Text style={styles.surpriseProductName} numberOfLines={2}>{surpriseDeal?.name}</Text>

                        <View style={styles.surprisePriceRow}>
                            {surpriseDeal && (
                                <>
                                    <Text style={styles.surprisePrice}>
                                        ${(surpriseDeal.price * (1 - surpriseDeal.discountPercentage / 100)).toFixed(2)}
                                    </Text>
                                    <Text style={styles.surpriseOriginalPrice}>
                                        ${surpriseDeal.price.toFixed(2)}
                                    </Text>
                                    <View style={styles.surpriseDiscountBadge}>
                                        <Text style={styles.surpriseDiscountText}>-{surpriseDeal.discountPercentage}%</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* CTA button */}
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const dealId = surpriseDeal?.id;
                                dismissDeal();
                                if (dealId) {
                                    router.push({
                                        pathname: '/(buyer)/(tabs)/product/[id]',
                                        params: { id: dealId, returnTo: pathname },
                                    } as any);
                                }
                            }}
                            style={styles.surpriseCtaButton}
                        >
                            <Text style={styles.surpriseCtaText}>Check it out</Text>
                        </Pressable>

                        {/* Progress bar */}
                        <View style={styles.surpriseProgressTrack}>
                            <Animated.View
                                style={[
                                    styles.surpriseProgressFill,
                                    { width: `${(dealCountdown / 10) * 100}%` },
                                ]}
                            />
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    thinkingDotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: GIFTYY_THEME.spacing.sm, gap: GIFTYY_THEME.spacing.xs },
    thinkingDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: GIFTYY_THEME.colors.primary },
    input: { flex: 1, minHeight: scale(24), maxHeight: verticalScale(120), color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Regular', fontSize: normalizeFont(15), padding: 0, textAlignVertical: 'center' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.3)' },
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    contentContainer: { flex: 1 },
    expandedMain: { backgroundColor: '#FFF5F0', flex: 1 }, // Subtle peach/cream "Aura"
    expandedHeader: { paddingHorizontal: GIFTYY_THEME.spacing.xl, paddingTop: GIFTYY_THEME.spacing.lg, paddingBottom: GIFTYY_THEME.spacing.md, flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray50 },
    headerTitle: { fontSize: GIFTYY_THEME.typography.sizes.xl, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text, marginBottom: scale(2) },
    headerSubtitle: { fontSize: normalizeFont(13), fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray500, lineHeight: normalizeFont(18) },
    headerCloseBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: GIFTYY_THEME.colors.gray50, alignItems: 'center', justifyContent: 'center' },
    tabsWrapper: { flexDirection: 'row', paddingHorizontal: GIFTYY_THEME.spacing.xl, paddingTop: GIFTYY_THEME.spacing.sm, paddingBottom: 0, gap: GIFTYY_THEME.spacing.xl, backgroundColor: 'transparent' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: GIFTYY_THEME.spacing.md, gap: GIFTYY_THEME.spacing.sm, position: 'relative' },
    activeTabButton: { backgroundColor: 'transparent' },
    tabButtonText: { fontSize: GIFTYY_THEME.typography.sizes.base, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray400 },
    activeTabButtonText: { color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Bold' },
    activeTabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: scale(3), backgroundColor: GIFTYY_THEME.colors.orange, borderRadius: scale(3) },
    chatArea: { flex: 1 },
    chatContent: { paddingBottom: verticalScale(80), paddingHorizontal: GIFTYY_THEME.spacing.lg },
    messageContainer: { marginBottom: GIFTYY_THEME.spacing.xl, maxWidth: '82%', flexShrink: 1 },
    aiMessageContainer: { alignSelf: 'flex-start' },
    userMessageContainer: { alignSelf: 'flex-end' },
    aiMessageRow: { flexDirection: 'row', alignItems: 'flex-end' },
    aiAvatarContainer: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: '#FFFFFF',
        marginRight: GIFTYY_THEME.spacing.sm,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(247, 85, 7, 0.1)',
        ...GIFTYY_THEME.shadows.sm
    },
    messageAvatar: { width: '100%', height: '100%' },
    bubbleWrapper: { position: 'relative', flexShrink: 1 },
    messageBubble: { paddingHorizontal: GIFTYY_THEME.spacing.lg, paddingVertical: GIFTYY_THEME.spacing.md, borderRadius: GIFTYY_THEME.radius.xl },
    aiBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0', borderBottomLeftRadius: scale(4), minHeight: scale(40) },
    userBubble: { backgroundColor: GIFTYY_THEME.colors.orange, borderBottomRightRadius: scale(4), ...GIFTYY_THEME.shadows.sm, minHeight: scale(40) },
    messageText: { fontSize: normalizeFont(15), lineHeight: normalizeFont(22), fontFamily: 'Outfit-Medium' },
    aiMessageText: { color: GIFTYY_THEME.colors.text },
    userMessageText: { color: '#FFFFFF' },
    recommendationCarousel: { marginTop: 0, marginHorizontal: -GIFTYY_THEME.spacing.lg, flexGrow: 0 },
    recommendationScrollContent: { paddingHorizontal: GIFTYY_THEME.spacing.lg, gap: GIFTYY_THEME.spacing.md, paddingBottom: GIFTYY_THEME.spacing.md, alignItems: 'flex-start' },
    recommendationGroup: { marginTop: GIFTYY_THEME.spacing.lg, marginBottom: GIFTYY_THEME.spacing.sm, marginLeft: 0, flexShrink: 0, flexGrow: 0 },
    recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginLeft: scale(46), marginBottom: GIFTYY_THEME.spacing.md },
    recommendationHeaderText: { fontSize: GIFTYY_THEME.typography.sizes.sm, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
    followupContainer: { marginLeft: scale(46), marginTop: GIFTYY_THEME.spacing.sm },
    followupBubble: { backgroundColor: '#F8F9FA', borderColor: GIFTYY_THEME.colors.gray100, borderWidth: 1, borderTopLeftRadius: 4 },
    actionButton: {
        paddingHorizontal: scale(18),
        paddingVertical: scale(11),
        borderRadius: scale(26),
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        ...GIFTYY_THEME.shadows.sm,
        elevation: 2,
    },
    actionButtonOutline: { 
        backgroundColor: '#FFFFFF', 
        borderWidth: 1.5, 
        borderColor: '#FFEFEA' // Very subtle orange tint
    },
    actionButtonPressed: { 
        backgroundColor: '#FFF5F0',
        transform: [{ scale: 0.98 }],
        opacity: 0.9
    },
    actionButtonText: {
        fontSize: GIFTYY_THEME.typography.sizes.base,
        fontFamily: 'Outfit-SemiBold',
        color: GIFTYY_THEME.colors.gray800
    },
    typingIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: GIFTYY_THEME.spacing.xs, paddingHorizontal: GIFTYY_THEME.spacing.sm, paddingVertical: scale(6), backgroundColor: '#FFFFFF', borderRadius: GIFTYY_THEME.radius.lg, alignSelf: 'flex-start', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, ...GIFTYY_THEME.shadows.sm, marginLeft: GIFTYY_THEME.spacing.lg, marginBottom: GIFTYY_THEME.spacing.lg },
    typingDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: GIFTYY_THEME.colors.gray400 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        paddingTop: GIFTYY_THEME.spacing.sm,
        backgroundColor: 'transparent',
        gap: GIFTYY_THEME.spacing.sm,
    },
    plusButton: {
        width: scale(52),
        height: scale(52),
        borderRadius: scale(26),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
        borderWidth: 1.5,
        borderColor: 'rgba(247, 85, 7, 0.05)',
        ...GIFTYY_THEME.shadows.sm,
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: scale(28),
        paddingLeft: GIFTYY_THEME.spacing.xl,
        paddingRight: scale(6),
        paddingVertical: scale(10),
        minHeight: scale(56),
        maxHeight: verticalScale(140),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(247, 85, 7, 0.1)', // Subtle brand tint
        ...GIFTYY_THEME.shadows.md,
    },
    initialGreetingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: GIFTYY_THEME.spacing.xl,
        paddingTop: verticalScale(140),
        paddingBottom: GIFTYY_THEME.spacing['2xl'],
    },
    initialGreetingAvatarWrapper: {
        width: scale(200),
        height: scale(200),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing['2xl'],
        backgroundColor: 'rgba(247, 85, 7, 0.03)',
        borderRadius: scale(100),
    },
    initialGreetingAvatar: {
        width: scale(140),
        height: scale(140),
    },
    surpriseModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing['3xl'],
    },
    surpriseModalCard: {
        backgroundColor: '#fff',
        borderRadius: GIFTYY_THEME.radius['2xl'],
        padding: GIFTYY_THEME.spacing['2xl'],
        width: '100%',
        maxWidth: scale(340),
        alignItems: 'center',
        shadowColor: '#f75507',
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    surpriseTimerBadge: {
        position: 'absolute',
        top: GIFTYY_THEME.spacing.lg,
        left: GIFTYY_THEME.spacing.lg,
        backgroundColor: '#FFF5F0',
        borderRadius: GIFTYY_THEME.radius.md,
        paddingHorizontal: GIFTYY_THEME.spacing.sm,
        paddingVertical: GIFTYY_THEME.spacing.xs,
        borderWidth: 1,
        borderColor: '#f75507',
    },
    surpriseTimerText: {
        fontSize: normalizeFont(13),
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: '#f75507',
        fontFamily: 'Outfit-Bold',
    },
    surpriseCloseBtn: {
        position: 'absolute',
        top: GIFTYY_THEME.spacing.md,
        right: GIFTYY_THEME.spacing.md,
        width: scale(28),
        height: scale(28),
        borderRadius: scale(14),
        backgroundColor: '#F0E8E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    surpriseCloseBtnText: {
        fontSize: GIFTYY_THEME.typography.sizes.base,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        color: '#766A61',
    },
    surpriseTitle: {
        fontSize: normalizeFont(22),
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontFamily: 'Outfit-Bold',
        color: '#2F2318',
        marginTop: GIFTYY_THEME.spacing.sm,
    },
    surpriseSubtitle: {
        fontSize: GIFTYY_THEME.typography.sizes.base,
        color: '#766A61',
        marginTop: GIFTYY_THEME.spacing.xs,
        marginBottom: GIFTYY_THEME.spacing.lg,
    },
    surpriseProductImage: {
        width: scale(160),
        height: scale(160),
        borderRadius: GIFTYY_THEME.radius.lg,
        backgroundColor: '#f0e8e0',
        marginBottom: GIFTYY_THEME.spacing.lg,
    },
    surpriseProductName: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontWeight: GIFTYY_THEME.typography.weights.bold,
        fontFamily: 'Outfit-SemiBold',
        color: '#2F2318',
        textAlign: 'center',
        marginBottom: GIFTYY_THEME.spacing.sm,
    },
    surprisePriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GIFTYY_THEME.spacing.sm,
        marginBottom: GIFTYY_THEME.spacing.lg,
    },
    surprisePrice: {
        fontSize: normalizeFont(22),
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        color: '#f75507',
        fontFamily: 'Outfit-Bold',
    },
    surpriseOriginalPrice: {
        fontSize: normalizeFont(15),
        color: '#999',
        textDecorationLine: 'line-through',
    },
    surpriseDiscountBadge: {
        backgroundColor: '#14b8a6',
        paddingHorizontal: GIFTYY_THEME.spacing.sm,
        paddingVertical: scale(3),
        borderRadius: GIFTYY_THEME.radius.sm,
    },
    surpriseDiscountText: {
        color: '#fff',
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
    },
    surpriseCtaButton: {
        backgroundColor: '#f75507',
        paddingVertical: scale(14),
        paddingHorizontal: GIFTYY_THEME.spacing['4xl'],
        borderRadius: scale(14),
        width: '100%',
        alignItems: 'center',
        marginBottom: GIFTYY_THEME.spacing.lg,
    },
    surpriseCtaText: {
        color: '#fff',
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
        fontFamily: 'Outfit-Bold',
    },
    surpriseProgressTrack: {
        width: '100%',
        height: scale(4),
        backgroundColor: '#F0E8E0',
        borderRadius: scale(2),
        overflow: 'hidden',
    },
    surpriseProgressFill: {
        height: '100%',
        backgroundColor: '#f75507',
        borderRadius: scale(2),
    },
    tapCountBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-4),
        backgroundColor: '#f75507',
        borderRadius: scale(12),
        width: scale(24),
        height: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    tapCountText: {
        color: '#fff',
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontWeight: GIFTYY_THEME.typography.weights.extrabold,
    },
    confettiContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        zIndex: 999,
    },
    confettiRect: {
        position: 'absolute',
        width: scale(10),
        height: scale(6),
        borderRadius: scale(2),
    },
    confettiCircle: {
        position: 'absolute',
        width: scale(9),
        height: scale(9),
        borderRadius: scale(5),
    },
    confettiStar: {
        position: 'absolute',
        width: scale(12),
        height: scale(12),
        borderRadius: scale(1),
    },
    confettiStreamer: {
        position: 'absolute',
        width: scale(4),
        height: scale(18),
        borderRadius: scale(2),
    },
    confettiRibbon: {
        position: 'absolute',
        width: scale(16),
        height: scale(5),
        borderRadius: scale(3),
    },
    confettiEmoji: {
        position: 'absolute',
    },
    initialGreetingTitle: {
        fontSize: GIFTYY_THEME.typography.sizes['4xl'],
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray900,
        marginBottom: GIFTYY_THEME.spacing.sm,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    initialGreetingText: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: normalizeFont(24),
        maxWidth: scale(300),
        opacity: 0.8
    },
    sendButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: GIFTYY_THEME.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: GIFTYY_THEME.spacing.sm,
    },
    sendButtonPressed: {
        backgroundColor: GIFTYY_THEME.colors.primaryDark,
        transform: [{ scale: 0.94 }],
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    actionMenu: {
        position: 'absolute',
        bottom: verticalScale(110),
        left: GIFTYY_THEME.spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: GIFTYY_THEME.radius['2xl'],
        padding: GIFTYY_THEME.spacing.md,
        width: scale(240),
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        ...GIFTYY_THEME.shadows.lg,
        zIndex: 50,
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing.md,
        borderRadius: GIFTYY_THEME.radius.md,
        gap: GIFTYY_THEME.spacing.md,
    },
    actionMenuItemPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    actionMenuIcon: {
        width: scale(32),
        height: scale(32),
        borderRadius: GIFTYY_THEME.radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionMenuText: {
        fontSize: normalizeFont(15),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.text,
    },
    actionMenuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 40,
    },
    mentionDropdown: {
        position: 'absolute',
        bottom: '100%',
        left: GIFTYY_THEME.spacing.lg,
        right: GIFTYY_THEME.spacing.lg,
        backgroundColor: '#FFFFFF',
        borderRadius: GIFTYY_THEME.radius.lg,
        maxHeight: verticalScale(250),
        marginBottom: GIFTYY_THEME.spacing.sm,
        ...GIFTYY_THEME.shadows.md,
        zIndex: 100,
    },
    mentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing.md,
        gap: GIFTYY_THEME.spacing.md,
    },
    mentionItemPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    mentionItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: GIFTYY_THEME.colors.gray50,
    },
    mentionAvatar: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mentionAvatarText: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.orange,
    },
    mentionName: {
        fontSize: normalizeFont(15),
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        marginBottom: scale(2),
    },
    mentionRel: {
        fontSize: normalizeFont(13),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
    },
    loadingBubble: {
        paddingHorizontal: GIFTYY_THEME.spacing.xl,
        paddingVertical: scale(14),
    },
    headerActions: {
        flexDirection: 'row',
        gap: GIFTYY_THEME.spacing.md,
        alignItems: 'center',
    },
    headerActionBtn: {
        padding: GIFTYY_THEME.spacing.sm,
        borderRadius: GIFTYY_THEME.radius.xl,
        backgroundColor: '#FFFFFF',
        ...GIFTYY_THEME.shadows.sm,
    },
    emptyHistory: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: GIFTYY_THEME.spacing['4xl'],
        paddingHorizontal: GIFTYY_THEME.spacing.xl,
    },
    emptyHistoryIconContainer: {
        width: scale(80),
        height: scale(80),
        borderRadius: scale(40),
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing['2xl'],
    },
    emptyHistoryTitle: {
        fontSize: GIFTYY_THEME.typography.sizes.xl,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        marginBottom: GIFTYY_THEME.spacing.sm,
        textAlign: 'center',
    },
    emptyHistoryText: {
        fontSize: normalizeFont(15),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        marginBottom: GIFTYY_THEME.spacing['3xl'],
        lineHeight: normalizeFont(22),
    },
    startChatBtn: {
        backgroundColor: GIFTYY_THEME.colors.orange,
        paddingHorizontal: GIFTYY_THEME.spacing['2xl'],
        paddingVertical: scale(14),
        borderRadius: GIFTYY_THEME.radius['2xl'],
        ...GIFTYY_THEME.shadows.md,
    },
    startChatBtnText: {
        color: '#FFFFFF',
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: 'Outfit-Bold',
    },

    mentionSubtext: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
    },
    fullScreenOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
    },
    navMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: GIFTYY_THEME.spacing.md,
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        backgroundColor: '#FFFFFF',
    },
    navMenuItem: {
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing.sm,
    },
    navMenuText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        marginTop: GIFTYY_THEME.spacing.xs,
    },
    historyDeleteBtn: {
        padding: GIFTYY_THEME.spacing.sm,
    },
    historyItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingHistoryButton: {
        position: 'absolute',
        right: GIFTYY_THEME.spacing.xl,
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: GIFTYY_THEME.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 90,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing.xl,
    },
    historyPopupContainer: {
        width: '92%',
        maxWidth: scale(440),
        maxHeight: '82%',
        backgroundColor: '#FFFFFF',
        borderRadius: scale(40),
        padding: scale(30),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.2,
        shadowRadius: 40,
        elevation: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: GIFTYY_THEME.spacing.xl,
    },
    modalBackdropFallback: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: GIFTYY_THEME.spacing['3xl'],
    },
    historyTitleText: {
        fontSize: GIFTYY_THEME.typography.sizes['2xl'],
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        letterSpacing: -0.5,
    },
    historySubtitleText: {
        fontSize: GIFTYY_THEME.typography.sizes.base,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        marginTop: scale(2),
    },
    historyCloseCircle: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    startChatGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: GIFTYY_THEME.spacing.lg,
        borderRadius: GIFTYY_THEME.radius.xl,
        gap: GIFTYY_THEME.spacing.sm,
        ...GIFTYY_THEME.shadows.md,
    },
    startChatGradientText: {
        color: '#FFFFFF',
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: 'Outfit-Bold',
    },
    historyLoadingBox: {
        paddingVertical: verticalScale(80),
        alignItems: 'center',
    },
    emptyHistoryState: {
        paddingVertical: verticalScale(60),
        alignItems: 'center',
    },
    emptyHistoryIconOuter: {
        width: scale(100),
        height: scale(100),
        borderRadius: scale(50),
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GIFTYY_THEME.spacing['2xl'],
    },
    emptyHistoryBody: {
        fontSize: normalizeFont(15),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
        textAlign: 'center',
        marginTop: GIFTYY_THEME.spacing.sm,
        lineHeight: normalizeFont(22),
    },
    historySearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: scale(18),
        paddingHorizontal: scale(18),
        paddingVertical: scale(14),
        marginBottom: GIFTYY_THEME.spacing['3xl'],
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historySearchInput: {
        flex: 1,
        marginLeft: GIFTYY_THEME.spacing.md,
        fontSize: normalizeFont(15),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.text,
        padding: 0,
    },
    historyGroupTitle: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray400,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: scale(18),
        opacity: 0.8,
    },
    historyItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: GIFTYY_THEME.spacing.lg,
        paddingHorizontal: GIFTYY_THEME.spacing.lg,
        borderRadius: GIFTYY_THEME.radius.xl,
        backgroundColor: 'transparent',
        marginBottom: GIFTYY_THEME.spacing.sm,
    },
    historyItemCardPressed: {
        backgroundColor: '#F8FAFC',
    },
    historyItemIconBox: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(14),
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: GIFTYY_THEME.spacing.lg,
    },
    historyItemPreview: {
        fontSize: GIFTYY_THEME.typography.sizes.md,
        fontFamily: 'Outfit-SemiBold',
        color: GIFTYY_THEME.colors.text,
        marginBottom: GIFTYY_THEME.spacing.xs,
    },
    historyItemMetaText: {
        fontSize: normalizeFont(13),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
    },
    historyNoResults: {
        paddingVertical: GIFTYY_THEME.spacing['4xl'],
        alignItems: 'center',
    },
    historyNoResultsText: {
        color: GIFTYY_THEME.colors.gray400,
        fontFamily: 'Outfit-Medium',
        fontSize: GIFTYY_THEME.typography.sizes.base,
    },
    profileScoreContainer: {
        marginLeft: scale(46),
        marginTop: GIFTYY_THEME.spacing.md,
        marginBottom: GIFTYY_THEME.spacing.sm,
        padding: GIFTYY_THEME.spacing.md,
        backgroundColor: '#FFFFFF',
        borderRadius: GIFTYY_THEME.radius.lg,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        ...GIFTYY_THEME.shadows.sm,
    },
    profileScoreTrack: {
        height: scale(6),
        backgroundColor: '#F1F5F9',
        borderRadius: scale(3),
        overflow: 'hidden',
        marginBottom: GIFTYY_THEME.spacing.sm,
    },
    profileScoreFill: {
        height: '100%',
        backgroundColor: GIFTYY_THEME.colors.orange,
        borderRadius: scale(3),
    },
    profileScoreText: {
        fontSize: GIFTYY_THEME.typography.sizes.sm,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    signalBadge: {
        position: 'absolute',
        bottom: scale(-6),
        right: scale(-6),
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        backgroundColor: GIFTYY_THEME.colors.orange,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    quickRepliesContainer: {
        marginTop: GIFTYY_THEME.spacing.sm,
        marginLeft: scale(46),
        marginRight: GIFTYY_THEME.spacing.lg,
    },
    quickRepliesContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GIFTYY_THEME.spacing.sm,
    },
    quickReplyButton: {
        paddingHorizontal: scale(14),
        paddingVertical: scale(9),
        borderRadius: scale(18),
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E8EAED',
        ...GIFTYY_THEME.shadows.sm,
    },
    quickReplyButtonPressed: {
        backgroundColor: GIFTYY_THEME.colors.cream,
        borderColor: GIFTYY_THEME.colors.primaryLight,
        transform: [{ scale: 0.96 }],
    },
    quickReplyText: {
        fontSize: normalizeFont(13),
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray700,
    },
});

console.log("END OF HOME AI INTERFACE MODULE EVALUATION!");
