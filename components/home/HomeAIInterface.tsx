import { RecommendationCard } from '@/components/home/RecommendationCard';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
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
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    const { user, profile } = useAuth();
    const firstName = profile?.first_name || user?.email?.split('@')[0] || 'friend';
    const { addRecipient } = useRecipients();
    const [text, setText] = useState(initialPrompt);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [showMentions, setShowMentions] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hi ${firstName}, I'm Giftyy! Who are we celebrating today? Describe them to me, or tag them with @ if they're already in your circle! ✨`,
            sender: 'ai',
        }
    ]);
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

    // Constraints State
    const [budget, setBudget] = useState<number>(100);
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

    const [showMenu, setShowMenu] = useState(false);
    const menuScale = useSharedValue(0);


    // Generate dynamic suggestions based on data
    const dynamicSuggestions = useMemo(() => {
        const suggestions: string[] = [];

        // 1. Take top upcoming occasions
        occasions.slice(0, 3).forEach(o => {
            const firstName = o.recipientName.split(' ')[0] || o.recipientName;
            suggestions.push(`Birthday gift for @${firstName}`);
        });

        if (suggestions.length < 6 && recipients.length > 0) {
            recipients.slice(0, 3).forEach(r => {
                const displayName = r.displayName || r.firstName;

                const sugg = `Gift ideas for @${displayName}`;
                if (!suggestions.includes(sugg)) {
                    suggestions.push(sugg);
                }
            });
        }

        // 3. Merge with defaults and unique them
        const combined = [...suggestions, ...DEFAULT_SUGGESTIONS];
        return Array.from(new Set(combined)).slice(0, 8);
    }, [recipients, occasions]);

    const expandedHeight = SCREEN_HEIGHT * 0.7; // Fixed height relative to screen for the inline chat block

    const containerStyle = useAnimatedStyle(() => {
        return {
            height: expandedHeight,
            borderRadius: 32,
        };
    });

    const expandedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: expansion.value,
            display: expansion.value > 0.1 ? 'flex' : 'none',
        };
    });

    const suggestionsStyle = useAnimatedStyle(() => {
        return {
            opacity: expansion.value,
            transform: [
                { translateY: interpolate(expansion.value, [0, 1], [20, 0]) }
            ],
            display: (expansion.value > 0.1 && messages.length <= 1) ? 'flex' : 'none',
        };
    });

    const handleFocus = () => {
        setIsExpanded(true);
        expansion.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.quad)
        });
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
                text: "You have reached the limit of 3 AI chat sessions. ✨ Please delete an older session from your history to start a new one!",
                sender: 'ai',
            }]);
            return;
        }

        setSessionId(null);
        setMessages([{
            id: '1',
            text: "Who are we celebrating today? Let's find some sparks of joy! ✨",
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
    const extractBudget = (input: string, currentBudget: number): number => {
        const match = input.match(/\$?(\d+)\s*(bucks|dollars)?/i);
        return match ? parseInt(match[1], 10) : currentBudget;
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
        if (lower.includes('mother')) return 'Mothers Day';
        if (lower.includes('father')) return 'Fathers Day';
        if (lower.match(/\bgift\b|\bpresent\b/)) return 'Gift';
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

            if (finalRecipientId && finalRecipientName) {
                console.log(`[DEBUG] Found mention: ${finalRecipientName} (${finalRecipientId})`);
                setContextRecipient({ 
                    id: finalRecipientId, 
                    name: finalRecipientName, 
                    relationship: finalRecipientRelationship || undefined 
                });
            } else if (contextRecipient) {
                finalRecipientId = contextRecipient.id;
                finalRecipientName = contextRecipient.name;
                finalRecipientRelationship = contextRecipient.relationship || null;
                console.log(`[DEBUG] Using contextual recipient: ${finalRecipientName}`);
            } else {
                console.log('[DEBUG] No recipient mentioned or found in context.');
            }

            console.log('[DEBUG] Cleaning text for occasion extraction...');
            let textForOccasion = searchText;
            if (finalRecipientName) {
                const nameRegex = new RegExp(finalRecipientName, 'ig');
                textForOccasion = textForOccasion.replace(nameRegex, '').replace(/@\w+/g, '');
            }

            console.log('[DEBUG] Extracting budget/occasion...');
            const reqBudget = extractBudget(searchText, budget);
            setBudget(reqBudget);
            const reqOccasion = extractOccasion(textForOccasion);
            console.log('[DEBUG] Extracted:', { reqBudget, reqOccasion });

            const historyToSend = [
                ...messages.filter(m => m.id !== '1'),
                userMsg
            ].map(m => ({
                role: m.sender === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));

            console.log('[DEBUG] Calling AI Recommend Function with params:', {
                recipientProfileId: finalRecipientId,
                recipientName: finalRecipientName,
                recipientRelationship: finalRecipientRelationship,
                occasion: reqOccasion,
                budget: reqBudget
            });

            const { data: recommendationsData, error } = await callAIRecommendFunction({
                recipientProfileId: finalRecipientId || undefined,
                recipientName: finalRecipientName || undefined,
                recipientRelationship: finalRecipientRelationship || undefined,
                budget: reqBudget,
                occasion: reqOccasion || undefined,
                freeText: searchText,
                chatHistory: historyToSend,
                feedbackHistory: feedbackHistory,
                constraints: {
                    gift_wrap_required: giftWrapRequired,
                    personalization_required: personalizationRequired
                }
            }, !!finalRecipientId);

            console.log('[DEBUG] AI Recommend Function returned:', {
                hasData: !!recommendationsData,
                error: error?.message,
                recCount: recommendationsData?.recommendations?.length,
                questionCount: recommendationsData?.clarifying_questions?.length
            });

            if (error || !recommendationsData) {
                throw new Error(error?.message || 'Failed to get recommendations from edge function');
            }

            let responseText = '';
            let aiMsg: Message;

            const hasQuestions = recommendationsData.clarifying_questions && recommendationsData.clarifying_questions.length > 0;
            const hasRecs = recommendationsData.recommendations && recommendationsData.recommendations.length > 0;

            if (hasQuestions || hasRecs) {
                const targetName = finalRecipientName ? ` for ${finalRecipientName}` : '';
                
                let text = '';
                if (hasRecs) {
                    text = `I've evaluated ${recommendationsData.candidates_evaluated} products and found these great matches${targetName}! ✨`;
                }

                // If we also have questions, append them or prioritize them in the follow-up
                let mainText = text;
                let followup = recommendationsData.chat_followup || "What do you think of these options?";

                if (hasQuestions) {
                    const questionText = recommendationsData.clarifying_questions.join('\n\n');
                    if (!mainText) {
                        mainText = questionText;
                        followup = "Reply here and we'll keep looking!";
                    } else {
                        // Append questions to main text if recommendations are also present
                        mainText += `\n\n${questionText}`;
                    }
                }

                aiMsg = {
                    id: (Date.now() + 2).toString(),
                    text: mainText,
                    sender: 'ai',
                    suggestions: hasRecs ? recommendationsData.recommendations : undefined,
                    followup,
                    message_script: recommendationsData.message_script,
                    quickReplies: recommendationsData.quick_replies
                };

                if (recommendationsData.cautions && recommendationsData.cautions.length > 0) {
                    aiMsg.text += `\n\n⚠️ Caution: ${recommendationsData.cautions.join(' ')}`;
                }
            } else {
                aiMsg = {
                    id: (Date.now() + 3).toString(),
                    text: responseText || "I'm sorry, I'm having a little trouble finding perfect matches right now. Let's try refining the interests or budget! ✨",
                    sender: 'ai',
                    quickReplies: recommendationsData.quick_replies
                };
            }

            setMessages(prev => [...prev, aiMsg]);

            // Record assistant message and recommendations
            if (currentSessionId && user?.id) {
                // Save with metadata for session persistence
                const metadata = {
                    suggestions: aiMsg.suggestions,
                    followup: aiMsg.followup,
                    quickReplies: aiMsg.quickReplies,
                    actions: aiMsg.actions
                };
                const { error: msgError } = await insertAIMessage(currentSessionId, 'assistant', responseText, metadata);
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
        } catch (error) {
            console.error('[FloatingAIInput]', error);
            const errorMsg: Message = {
                id: (Date.now() + 4).toString(),
                text: "I'm sorry, I'm having trouble connecting to Giftyy right now. Please try again later.",
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
            router.push(`/(buyer)/(tabs)/product/${suggestion.product_id}`);
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[styles.contentContainer, { flex: 1 }]}>
                    {/* Header & Main Chat Area */}
                    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
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
                            {messages.length > 1 && <View style={{ height: top + 60 }} />}

                            {/* Safe area spacer for when children are hidden */}
                            {/* messages.length > 1 && <View style={{ height: top + 10 }} /> */}

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
                                                <View key={msg.id} style={styles.initialGreetingContainer}>
                                                    <View style={styles.initialGreetingAvatarWrapper}>
                                                        <Image
                                                            source={require('@/assets/images/giftyy.png')}
                                                            style={styles.initialGreetingAvatar}
                                                            resizeMode="cover"
                                                        />
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
                                                                return renderFormattedText("Who are we celebrating today? Let's find some sparks of joy! ✨", false, GIFTYY_THEME.colors.gray500);
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
                                    <View style={{ minHeight: SCREEN_HEIGHT * 0.4 }}>
                                        {children}
                                    </View>
                                </View>
                            )}

                            {messages.length > 1 && messages.map((msg, index) => {

                                return (
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
                                                            {msg.message_script && (
                                                                <Text style={[styles.messageText, { fontSize: 13, fontWeight: '700', color: GIFTYY_THEME.colors.primary, marginBottom: 8 }]}>
                                                                    💬 You can use this note!
                                                                </Text>
                                                            )}
                                                            <Text style={[styles.messageText, styles.aiMessageText, { fontStyle: msg.message_script ? 'italic' : 'normal' }]}>
                                                                {msg.message_script || msg.followup}
                                                            </Text>
                                                            {msg.message_script && msg.followup && (
                                                                <>
                                                                    <View style={{ height: 1, backgroundColor: GIFTYY_THEME.colors.gray50, marginVertical: 12 }} />
                                                                    <Text style={[styles.messageText, styles.aiMessageText]}>
                                                                        {msg.followup}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {msg.actions && msg.actions.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginLeft: 46 }}>
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
                                            </View>
                                        )}

                                        {msg.quickReplies && msg.quickReplies.length > 0 && (!msg.suggestions || msg.suggestions.length === 0) && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginLeft: 46 }}>
                                                {msg.quickReplies.map((reply, idx) => (
                                                    <Pressable
                                                        key={idx}
                                                        style={({ pressed }) => [
                                                            styles.actionButton,
                                                            styles.actionButtonOutline,
                                                            pressed && styles.actionButtonPressed
                                                        ]}
                                                        onPress={() => {
                                                            setText(reply);
                                                            handleSubmit(reply);
                                                        }}
                                                    >
                                                        <Text style={styles.actionButtonText}>{reply}</Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

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

                        {/* Suggestions Carousel - Now inside the white container */}
                        <AnimatedView style={[
                            styles.suggestionsRow,
                            suggestionsStyle,
                            messages.length > 1 && { borderTopWidth: 0 }
                        ]}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionsScroll}
                                keyboardShouldPersistTaps="handled"
                            >
                                {dynamicSuggestions.map((s, i) => (
                                    <Pressable
                                        key={i}
                                        style={({ pressed }) => [
                                            styles.suggestionChip,
                                            pressed && styles.suggestionChipPressed
                                        ]}
                                        onPress={() => {
                                            setText(s);
                                            handleSubmit(s);
                                        }}
                                    >
                                        <Text style={styles.suggestionText}>{renderFormattedText(s)}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </AnimatedView>
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
                            style={[styles.floatingHistoryButton, { bottom: Math.max(bottom, 24) + 230 }]}
                            onPress={handleHistoryPress}
                        >
                            <IconSymbol name="clock.fill" size={24} color="#FFFFFF" />
                        </Pressable>
                    )}

                    <View style={[styles.inputWrapper, { paddingBottom: Math.max(bottom, 24) + 32 }]}>
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
                                <IconSymbol name={showMenu ? "xmark" : "line.3.horizontal"} size={20} color={GIFTYY_THEME.colors.gray600} />
                            </Pressable>
                        </TourAnchor>
                        <TourAnchor step="home_ai_chat" style={styles.textInputContainer}>
                            <TourAnchor step="home_tagging" style={StyleSheet.absoluteFillObject} />
                            <TextInput
                                ref={inputRef}
                                style={[styles.input, { maxHeight: 100 }]}
                                placeholder="Ask Giftyy (Use @ to tag)"
                                placeholderTextColor="#94A3B8"
                                value={text}
                                onChangeText={handleTextChange}
                                onSelectionChange={handleSelectionChange}
                                onFocus={handleFocus}
                                multiline
                                onSubmitEditing={() => handleSubmit()}
                                returnKeyType="send"
                            />
                        </TourAnchor>
                        <Pressable
                            onPress={() => handleSubmit()}
                            disabled={!text.trim() || loading}
                            style={({ pressed }) => [
                                styles.sendButton,
                                (!text.trim() || loading || pressed) && styles.sendButtonDisabled
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={GIFTYY_THEME.colors.primary} />
                            ) : (
                                <IconSymbol
                                    name="arrow.up"
                                    size={22}
                                    color="#FFFFFF"
                                />
                            )}
                        </Pressable>
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
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={() => setIsHistoryVisible(false)}
                />
                <View style={styles.modalContentWrapper}>
                    <View style={styles.historyPopupContainer}>
                        <View style={styles.historyHeader}>
                            <View>
                                <Text style={styles.historyHeaderText}>Recent Chats</Text>
                                <Text style={styles.historyHeaderSessionCount}>
                                    {pastSessions.length} {pastSessions.length === 1 ? 'session' : 'sessions'}
                                </Text>
                            </View>
                            <Pressable
                                style={styles.historyCloseBtn}
                                onPress={() => setIsHistoryVisible(false)}
                                hitSlop={12}
                            >
                                <IconSymbol name="xmark" size={22} color={GIFTYY_THEME.colors.gray400} />
                            </Pressable>
                        </View>

                        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                            <Pressable 
                                style={[
                                    styles.startChatBtn, 
                                    { width: '100%', marginTop: 0 },
                                    pastSessions.length >= 3 && { opacity: 0.5 }
                                ]}
                                onPress={() => {
                                    startNewChat();
                                    setIsHistoryVisible(false);
                                }}
                            >
                                <IconSymbol name="plus" size={16} color="#FFF" />
                                <Text style={styles.startChatBtnText}>New Chat</Text>
                            </Pressable>
                        </View>

                        {loadingSessions ? (
                            <View style={styles.historyLoadingContainer}>
                                <ActivityIndicator color={GIFTYY_THEME.colors.primary} />
                            </View>
                        ) : pastSessions.length === 0 ? (
                            <View style={styles.emptyHistoryPopup}>
                                <View style={styles.emptyHistoryIconWrapper}>
                                    <IconSymbol name="message.fill" size={42} color={GIFTYY_THEME.colors.gray200} />
                                </View>
                                <Text style={styles.emptyHistoryTitle}>No chats yet</Text>
                                <Text style={styles.emptyHistoryText}>Your gifting conversations will appear here.</Text>
                                <Pressable
                                    style={styles.startChatBtn}
                                    onPress={() => {
                                        startNewChat();
                                        setIsHistoryVisible(false);
                                    }}
                                >
                                    <Text style={styles.startChatBtnText}>Start your first chat</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <View style={styles.historySearchWrapper}>
                                    <IconSymbol name="magnifyingglass" size={16} color={GIFTYY_THEME.colors.gray400} />
                                    <TextInput
                                        style={styles.historySearchInput}
                                        placeholder="Find a conversation..."
                                        placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                        value={historySearchQuery}
                                        onChangeText={setHistorySearchQuery}
                                    />
                                    {historySearchQuery.length > 0 && (
                                        <Pressable onPress={() => setHistorySearchQuery('')} hitSlop={8}>
                                            <IconSymbol name="xmark.circle.fill" size={16} color={GIFTYY_THEME.colors.gray300} />
                                        </Pressable>
                                    )}
                                </View>

                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {groupedSessions.length === 0 ? (
                                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                            <Text style={{ color: GIFTYY_THEME.colors.gray400, fontFamily: 'Outfit-Medium', fontSize: 14 }}>
                                                No results found
                                            </Text>
                                        </View>
                                    ) : groupedSessions.map((group) => (
                                        <View key={group.title} style={{ marginBottom: 24 }}>
                                            <Text style={styles.historyGroupTitle}>{group.title}</Text>
                                            {group.data.map((session: any, idx: number) => (
                                                <View key={session.id}>
                                                    <View style={styles.historyItemRow}>
                                                        <Pressable
                                                            style={styles.historyItemMainContent}
                                                            onPress={() => {
                                                                loadPastSession(session);
                                                                setIsHistoryVisible(false);
                                                            }}
                                                        >
                                                            <View style={styles.historyItemAvatar}>
                                                                <IconSymbol name="clock.fill" size={14} color={GIFTYY_THEME.colors.primary} />
                                                            </View>
                                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                                <Text style={styles.historyItemTitle} numberOfLines={1}>
                                                                    {session.previewText}
                                                                </Text>
                                                                <Text style={styles.historyItemDate}>
                                                                    {new Date(session.last_active_at).toLocaleDateString(undefined, {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </Text>
                                                            </View>
                                                        </Pressable>
                                                    </View>
                                                    {idx < group.data.length - 1 && <View style={styles.historyItemDivider} />}
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    thinkingDotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 4 },
    thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GIFTYY_THEME.colors.primary },
    input: { flex: 1, minHeight: 24, maxHeight: 120, color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Regular', fontSize: 15, padding: 0 },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.3)' },
    container: { flex: 1, backgroundColor: GIFTYY_THEME.colors.cream },
    contentContainer: { flex: 1, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0 },
    expandedMain: { backgroundColor: GIFTYY_THEME.colors.cream, flex: 1 },
    expandedHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray50 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text, marginBottom: 2 },
    headerSubtitle: { fontSize: 13, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray500, lineHeight: 18 },
    headerCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: GIFTYY_THEME.colors.gray50, alignItems: 'center', justifyContent: 'center' },
    tabsWrapper: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0, gap: 20, backgroundColor: 'transparent' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8, position: 'relative' },
    activeTabButton: { backgroundColor: 'transparent' },
    tabButtonText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray400 },
    activeTabButtonText: { color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Bold' },
    activeTabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: GIFTYY_THEME.colors.orange, borderRadius: 3 },
    chatArea: { flex: 1 },
    chatContent: { paddingBottom: 120, paddingHorizontal: 16 },
    messageContainer: { marginBottom: 20, maxWidth: '82%', flexShrink: 0, flex: 0 },
    aiMessageContainer: { alignSelf: 'flex-start' },
    userMessageContainer: { alignSelf: 'flex-end' },
    aiMessageRow: { flexDirection: 'row', alignItems: 'flex-end' },
    aiAvatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: GIFTYY_THEME.colors.gray50, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100 },
    messageAvatar: { width: '100%', height: '100%' },
    bubbleWrapper: { position: 'relative', flexShrink: 1 },
    messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
    aiBubble: { backgroundColor: '#F4F4F5', borderBottomLeftRadius: 4 },
    userBubble: { backgroundColor: GIFTYY_THEME.colors.orange, borderBottomRightRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 22, fontFamily: 'Outfit-Medium' },
    aiMessageText: { color: GIFTYY_THEME.colors.text },
    userMessageText: { color: '#FFFFFF' },
    recommendationCarousel: { marginTop: 0, marginHorizontal: -16, flexGrow: 0 },
    recommendationScrollContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 12, alignItems: 'flex-start' },
    recommendationGroup: { marginTop: 16, marginBottom: 8, marginLeft: 0, flexShrink: 0, flexGrow: 0 },
    recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 46, marginBottom: 12 },
    recommendationHeaderText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
    followupContainer: { marginLeft: 46, marginTop: 8 },
    followupBubble: { backgroundColor: '#F8F9FA', borderColor: GIFTYY_THEME.colors.gray100, borderWidth: 1, borderTopLeftRadius: 4 },
    actionButton: { 
        paddingHorizontal: 18, 
        paddingVertical: 11, 
        borderRadius: 26, 
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
        fontSize: 14, 
        fontFamily: 'Outfit-SemiBold', 
        color: GIFTYY_THEME.colors.gray800 
    },
    typingIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, ...GIFTYY_THEME.shadows.sm, marginLeft: 16, marginBottom: 16 },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GIFTYY_THEME.colors.gray400 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 8,
        backgroundColor: 'transparent',
        gap: 8,
    },
    plusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 48,
        maxHeight: 120,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    initialGreetingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 100,
        paddingBottom: 24,
    },
    initialGreetingAvatarWrapper: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    initialGreetingAvatar: {
        width: 154,
        height: 154,
    },
    initialGreetingTitle: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray500,
        marginBottom: 4,
        textAlign: 'center'
    },
    initialGreetingText: {
        fontSize: 15,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
        fontWeight: '500'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: GIFTYY_THEME.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        ...GIFTYY_THEME.shadows.md,
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOpacity: 0.35,
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 0,
    },
    actionMenu: {
        position: 'absolute',
        bottom: 108,
        left: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 8,
        width: 220,
        ...GIFTYY_THEME.shadows.md,
        zIndex: 50,
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    actionMenuItemPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    actionMenuIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionMenuText: {
        fontSize: 15,
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
    suggestionsRow: {
        paddingTop: 8,
        paddingBottom: 4,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
    },
    suggestionsScroll: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    suggestionChip: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: '#F8F9FA',
        ...GIFTYY_THEME.shadows.sm,
        elevation: 2,
    },
    suggestionChipPressed: {
        backgroundColor: '#F8F9FA',
        transform: [{ scale: 0.98 }],
    },
    suggestionText: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: GIFTYY_THEME.colors.gray800,
    },
    mentionDropdown: {
        position: 'absolute',
        bottom: '100%',
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        maxHeight: 250,
        marginBottom: 8,
        ...GIFTYY_THEME.shadows.md,
        zIndex: 100,
    },
    mentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    mentionItemPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
    },
    mentionItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: GIFTYY_THEME.colors.gray50,
    },
    mentionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mentionAvatarText: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.orange,
    },
    mentionName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        marginBottom: 2,
    },
    mentionRel: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
    },
    loadingBubble: {
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    headerActionBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        ...GIFTYY_THEME.shadows.sm,
    },
    emptyHistory: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyHistoryIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyHistoryTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyHistoryText: {
        fontSize: 15,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    startChatBtn: {
        backgroundColor: GIFTYY_THEME.colors.orange,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
        ...GIFTYY_THEME.shadows.md,
    },
    startChatBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },

    mentionSubtext: {
        fontSize: 12,
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
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        backgroundColor: '#FFFFFF',
    },
    navMenuItem: {
        alignItems: 'center',
        padding: 8,
    },
    navMenuText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray500,
        marginTop: 4,
    },
    historyDeleteBtn: {
        padding: 8,
    },
    historyItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingHistoryButton: {
        position: 'absolute',
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
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
        padding: 20,
    },
    historyPopupContainer: {
        width: '92%',
        maxWidth: 420,
        maxHeight: '82%',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 15,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    historyHeaderText: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
    },
    historyHeaderSessionCount: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
        marginTop: 2,
    },
    historyCloseBtn: {
        padding: 6,
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
    },
    historyLoadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyHistoryPopup: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyHistoryIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    historySearchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F4F5',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 24,
    },
    historySearchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.text,
        padding: 0,
    },
    historyGroupTitle: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.gray300,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 2,
    },
    historyItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    historyItemMainContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyItemAvatar: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    historyItemTitle: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
        lineHeight: 20,
        marginBottom: 4,
    },
    historyItemDate: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
    },
    historyItemDivider: {
        height: 1,
        backgroundColor: '#F1F1F1',
        marginLeft: 50,
    },
});

console.log("END OF HOME AI INTERFACE MODULE EVALUATION!");
