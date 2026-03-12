import { RecommendationCard } from '@/components/home/RecommendationCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import {
    callAIRecommendFunction,
    createAISession,
    deleteAISession,
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
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedKeyboard,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
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

export default function HomeAIInterface({ onSearch, recipients = [], occasions = [], products = [], initialPrompt = '' }: Props) {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const { bottom, top } = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const { addRecipient, addOccasion } = useRecipients();
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
            text: "Hi there! I'm your Giftyy Companion. Tag a recipient (e.g., @Mom) and tell me the occasion or budget, and I'll find the perfect gift!",
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
    const [contextRecipient, setContextRecipient] = useState<{ id: string, name: string } | null>(null);

    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const expansion = useSharedValue(1); // Default to expanded since it's inline now

    // Positioned at the bottom of the screen
    const bottomSpacing = bottom + 12;

    const [showMenu, setShowMenu] = useState(false);
    const menuScale = useSharedValue(0);


    // Generate dynamic suggestions based on data
    const dynamicSuggestions = useMemo(() => {
        const suggestions: string[] = [];

        // 1. Take top upcoming occasions
        occasions.slice(0, 3).forEach(o => {
            suggestions.push(`Birthday gift for @${o.recipientName}`);
        });

        // 2. Add recipient-based suggestions
        if (suggestions.length < 6 && recipients.length > 0) {
            recipients.slice(0, 3).forEach(r => {
                const sugg = `Gift ideas for @${r.firstName}`;
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

    const keyboard = useAnimatedKeyboard();

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
                    text: "Hi there! I'm your Giftyy Companion. Tag a recipient (e.g., @Mom) and tell me the occasion or budget, and I'll find the perfect gift!",
                    sender: 'ai',
                });
            }

            setMessages(loadedMessages);
            setIsHistoryVisible(false);
            // Optionally auto-scroll to bottom after a delay
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        }
        setLoading(false);
    };

    const startNewChat = () => {
        setSessionId(null);
        setMessages([{
            id: '1',
            text: "Hi there! I'm your Giftyy Companion. Tag a recipient (e.g., @Mom) and tell me the occasion or budget, and I'll find the perfect gift!",
            sender: 'ai',
        }]);
        setContextRecipient(null);
        setText('');
        setFeedbackHistory([]);
        setIsHistoryVisible(false);
        inputRef.current?.focus();
    };

    const handleHistoryPress = () => {
        setIsHistoryVisible(true);
        setIsExpanded(true);
        expansion.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.quad)
        });
        setShowMenu(false);
    };

    const handleDeleteSession = async (sessId: string) => {
        const { error } = await deleteAISession(sessId);
        if (!error) {
            setPastSessions(prev => prev.filter(s => s.id !== sessId));
            if (sessionId === sessId) {
                startNewChat();
            }
        } else {
            console.error('[FloatingAIInput] Failed to delete session:', error.message);
        }
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
            const recipientIdToUse = contextRecipient?.id || null;

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

    const handleTextChange = (newText: string) => {
        setText(newText);

        // Find if we are typing after an @
        const parts = newText.split(' ');
        const lastPart = parts[parts.length - 1];

        if (lastPart.startsWith('@')) {
            const query = lastPart.slice(1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            setMentionQuery(query);
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const handleSelectionChange = (event: any) => {
        const { start, end } = event.nativeEvent.selection;
        setSelection({ start, end });

        // If the cursor is on an @mention, show the dropdown to change it
        const wordInfo = getWordAtSelection(text, start);
        if (wordInfo && wordInfo.word.startsWith('@')) {
            const query = wordInfo.word.slice(1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            setMentionQuery(query);
            setShowMentions(true);
        }
    };

    const handleMentionSelect = (recipient: any) => {
        const wordInfo = getWordAtSelection(text, selection.start);

        // Keep spaces for better highlighting and user experience (e.g. '@Ma Baby love')
        const tag = '@' + recipient.firstName + (recipient.lastName ? ' ' + recipient.lastName : '');

        if (wordInfo && wordInfo.word.startsWith('@')) {
            const words = text.split(/(\s+)/);
            words[wordInfo.index] = tag;
            const newText = words.join('');
            // If it was the last word, add a space
            setText(newText + (wordInfo.index === words.length - 1 ? ' ' : ''));
        } else {
            // Fallback for edge cases
            const parts = text.split(' ');
            parts[parts.length - 1] = tag;
            setText(parts.join(' ') + ' ');
        }

        setShowMentions(false);
        inputRef.current?.focus();
    };

    const filteredRecipients = useMemo(() => {
        if (!mentionQuery) return recipients;
        return recipients.filter(r =>
            r.firstName.toLowerCase().includes(mentionQuery) ||
            r.lastName?.toLowerCase().includes(mentionQuery)
        );
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

    const renderFormattedText = (rawText: string, isInput = false) => {
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
                        color: part.isTag ? '#000000' : defaultColor,
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
                title: searchText.trim().slice(0, 200) || 'Giftyy AI Chat',
            });
            if (!sessionError && data?.id) {
                currentSessionId = data.id;
                setSessionId(currentSessionId);
                console.log('[DEBUG] Session created:', currentSessionId);
            } else if (sessionError) {
                console.warn('[FloatingAIInput] Failed to create AI session:', sessionError.message, sessionError.code);
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

            // 1. Try exact matches on original first names (allows spaces if typed manually like '@Ma Baby')
            const sortedRecipients = [...recipients].sort((a, b) => b.firstName.length - a.firstName.length);
            for (const recipient of sortedRecipients) {
                if (searchText.toLowerCase().includes('@' + recipient.firstName.toLowerCase())) {
                    mentionedRecipientId = recipient.profileId;
                    mentionedRecipientName = recipient.firstName;
                    break;
                }
            }

            // 2. Fallback to extracting the \w+ tag and matching without spaces (for autocomplete tags)
            if (!mentionedRecipientId) {
                const mentionMatch = searchText.match(/@(\w+)/);
                if (mentionMatch) {
                    const name = mentionMatch[1].toLowerCase();
                    const recipient = recipients.find(r =>
                        r.firstName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === name
                    );
                    if (recipient) {
                        mentionedRecipientId = recipient.profileId;
                        mentionedRecipientName = recipient.firstName;
                    }
                }
            }

            // 3. Fallback to basic case-insensitive word matching without @ symbol
            if (!mentionedRecipientId) {
                for (const recipient of sortedRecipients) {
                    // Match whole word only (e.g., 'Mom', 'Brother')
                    const nameRegex = new RegExp(`\\b${recipient.firstName.trim()}\\b`, 'i');
                    if (nameRegex.test(searchText)) {
                        mentionedRecipientId = recipient.profileId;
                        mentionedRecipientName = recipient.firstName;
                        break;
                    }
                }
            }

            // Restore from context if user didn't mention anyone this time
            if (mentionedRecipientId && mentionedRecipientName) {
                console.log(`[DEBUG] Found mention: ${mentionedRecipientName} (${mentionedRecipientId})`);
                setContextRecipient({ id: mentionedRecipientId, name: mentionedRecipientName });
            } else if (contextRecipient) {
                mentionedRecipientId = contextRecipient.id;
                mentionedRecipientName = contextRecipient.name;
                console.log(`[DEBUG] Using contextual recipient: ${mentionedRecipientName} (${mentionedRecipientId})`);
            } else {
                console.log('[DEBUG] No recipient mentioned or found in context.');
            }

            console.log('[DEBUG] Cleaning text for occasion extraction...');
            let textForOccasion = searchText;
            if (mentionedRecipientName) {
                // Remove the exact name (case insensitive) and @mentions
                const nameRegex = new RegExp(mentionedRecipientName, 'ig');
                textForOccasion = textForOccasion.replace(nameRegex, '').replace(/@\w+/g, '');
            }

            console.log('[DEBUG] Extracting budget/occasion...');
            const reqBudget = extractBudget(searchText, budget);
            const reqOccasion = extractOccasion(textForOccasion);
            console.log('[DEBUG] Extracted:', { reqBudget, reqOccasion });

            // Only force the user to pick an occasion if it's the very first message
            if (!reqOccasion && messages.length <= 1) {
                console.log('[DEBUG] No occasion found, prompting user...');
                // Find upcoming occasions for this recipient if we have one
                const recipientOccasions = mentionedRecipientId ? occasions
                    .filter(o => o.recipientProfileId === mentionedRecipientId)
                    .map(o => o.label)
                    .slice(0, 3) : []; // Top 3

                // Default fallbacks if they have none
                const quickReplies = recipientOccasions.length > 0
                    ? recipientOccasions
                    : ['Birthday', 'Anniversary', 'Just a gift'];

                const textPrompt = mentionedRecipientName
                    ? `What's the occasion for ${mentionedRecipientName}?`
                    : `Who are we shopping for, and what's the occasion? (You can tag someone with '@' if you have their profile!)`;

                const aiMsg: Message = {
                    id: (Date.now() + 2).toString(),
                    text: textPrompt,
                    sender: 'ai',
                    quickReplies
                };
                setMessages(prev => [...prev, aiMsg]);
                setLoading(false);
                return;
            }

            const actRecipient = mentionedRecipientId ? recipients.find(r => r.profileId === mentionedRecipientId) : null;

            const historyToSend = [
                ...messages.filter(m => m.id !== '1'),
                userMsg
            ].map(m => ({
                role: m.sender === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));

            console.log('[DEBUG] Calling AI Recommend Function with params:', {
                recipientProfileId: mentionedRecipientId,
                occasion: reqOccasion,
                budget: reqBudget
            });

            const { data: recommendationsData, error } = await callAIRecommendFunction({
                recipientProfileId: mentionedRecipientId || null,
                recipientName: actRecipient?.firstName || mentionedRecipientName || undefined,
                recipientRelationship: actRecipient?.relationship || undefined,
                budget: reqBudget,
                occasion: reqOccasion || undefined,
                freeText: searchText,
                chatHistory: historyToSend,
                feedbackHistory: feedbackHistory,
                constraints: {
                    gift_wrap_required: giftWrapRequired,
                    personalization_required: personalizationRequired
                }
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

            let responseText = '';
            let aiMsg: Message;

            if (recommendationsData.clarifying_questions && recommendationsData.clarifying_questions.length > 0) {
                responseText = "I need a little more info to find the perfect gift:\n\n" +
                    recommendationsData.clarifying_questions.map(q => `• ${q}`).join('\n');
                aiMsg = {
                    id: (Date.now() + 1).toString(),
                    text: responseText,
                    sender: 'ai',
                    followup: "Reply here and we'll keep looking!"
                };
            } else if (recommendationsData.recommendations && recommendationsData.recommendations.length > 0) {
                const targetName = mentionedRecipientName ? ` for ${mentionedRecipientName}` : '';
                responseText = `I've evaluated ${recommendationsData.candidates_evaluated} products and found these great matches${targetName}!`;
                aiMsg = {
                    id: (Date.now() + 2).toString(),
                    text: responseText,
                    sender: 'ai',
                    suggestions: recommendationsData.recommendations,
                    followup: recommendationsData.chat_followup || "What do you think of these options?",
                    message_script: recommendationsData.message_script,
                };

                // Display cautions if any
                if (recommendationsData.cautions && recommendationsData.cautions.length > 0) {
                    aiMsg.text += `\n\n⚠️ Caution: ${recommendationsData.cautions.join(' ')}`;
                }
            } else {
                const targetName = mentionedRecipientName ? ` for ${mentionedRecipientName}` : '';
                responseText = `I couldn't find any perfect matches in our catalog${targetName} under $${reqBudget}. Please try adjusting the budget or constraints!`;
                aiMsg = {
                    id: (Date.now() + 3).toString(),
                    text: responseText,
                    sender: 'ai',
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
                                recipientId: mentionedRecipientId,
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
                text: "I'm sorry, I'm having trouble connecting to the Giftyy AI service right now. Please try again later.",
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
            const { error } = await insertAIFeedback({
                userId: user.id,
                feedbackType: 'like',
                productId: suggestion.product_id,
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
            setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, loading, isExpanded]);

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Header & Main Chat Area */}
                <View style={styles.expandedMain}>
                    <View style={styles.expandedHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>
                                Your <Text style={{ color: GIFTYY_THEME.colors.orange }}>Giftyy</Text> Companion
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {isHistoryVisible ? 'Your past conversations' : 'Finding thoughtful gifts together'}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            {!isHistoryVisible && (
                                <Pressable onPress={() => setIsHistoryVisible(true)} hitSlop={12} style={styles.headerActionBtn}>
                                    <IconSymbol name="clock.fill" size={18} color={GIFTYY_THEME.colors.gray500} />
                                </Pressable>
                            )}
                            {isHistoryVisible && (
                                <Pressable onPress={() => setIsHistoryVisible(false)} hitSlop={12} style={styles.headerActionBtn}>
                                    <IconSymbol name="message.fill" size={18} color={GIFTYY_THEME.colors.gray500} />
                                </Pressable>
                            )}
                        </View>
                    </View>


                    <ScrollView
                        ref={scrollRef}
                        style={styles.chatArea}
                        contentContainerStyle={styles.chatContent}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        keyboardShouldPersistTaps="handled"
                    >
                        {isHistoryVisible ? (
                            <View style={styles.historyContainer}>
                                {loadingSessions ? (
                                    <ActivityIndicator color={GIFTYY_THEME.colors.primary} style={{ marginTop: 24 }} />
                                ) : pastSessions.length === 0 ? (
                                    <View style={styles.emptyHistory}>
                                        <View style={styles.emptyHistoryIconContainer}>
                                            <IconSymbol name="message.fill" size={42} color={GIFTYY_THEME.colors.gray200} />
                                        </View>
                                        <Text style={styles.emptyHistoryTitle}>No chats yet</Text>
                                        <Text style={styles.emptyHistoryText}>Your gifting conversations will appear here.</Text>
                                        <Pressable style={styles.startChatBtn} onPress={startNewChat}>
                                            <Text style={styles.startChatBtnText}>Start your first chat</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.historyHeader}>
                                            <Text style={styles.historyHeaderText}>Recent Chats</Text>
                                            <Pressable style={styles.historyNewChatBtn} onPress={startNewChat}>
                                                <IconSymbol name="plus" size={16} color={GIFTYY_THEME.colors.primary} />
                                                <Text style={styles.historyNewChatBtnText}>New Chat</Text>
                                            </Pressable>
                                        </View>

                                        <View style={styles.historySearchWrapper}>
                                            <IconSymbol name="magnifyingglass" size={18} color={GIFTYY_THEME.colors.gray400} />
                                            <TextInput
                                                style={styles.historySearchInput}
                                                placeholder="Search past chats..."
                                                placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                                value={historySearchQuery}
                                                onChangeText={setHistorySearchQuery}
                                            />
                                            {historySearchQuery.length > 0 && (
                                                <Pressable onPress={() => setHistorySearchQuery('')}>
                                                    <IconSymbol name="xmark.circle.fill" size={18} color={GIFTYY_THEME.colors.gray300} />
                                                </Pressable>
                                            )}
                                        </View>

                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {groupedSessions.length === 0 ? (
                                                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                                    <Text style={{ color: GIFTYY_THEME.colors.gray400, fontFamily: 'Outfit-Medium' }}>No chats found for "{historySearchQuery}"</Text>
                                                </View>
                                            ) : groupedSessions.map((group) => (
                                                <View key={group.title} style={{ marginBottom: 24 }}>
                                                    <Text style={styles.historyGroupTitle}>{group.title}</Text>
                                                    {group.data.map((session: any) => (
                                                        <View key={session.id} style={styles.historyItemCard}>
                                                            <Pressable
                                                                style={styles.historyItemContent}
                                                                onPress={() => {
                                                                    loadPastSession(session);
                                                                }}
                                                            >
                                                                <View style={styles.historyIconCircle}>
                                                                    <IconSymbol name="message.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                                                                </View>
                                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                                    <Text style={styles.historyItemTitle} numberOfLines={2}>
                                                                        {renderFormattedText(session.previewText)}
                                                                    </Text>
                                                                    <View style={styles.historyItemMeta}>
                                                                        <IconSymbol name="calendar" size={12} color={GIFTYY_THEME.colors.gray400} />
                                                                        <Text style={styles.historyItemDate}>
                                                                            {new Date(session.last_active_at).toLocaleDateString(undefined, {
                                                                                month: 'short',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </Pressable>
                                                            <Pressable
                                                                style={styles.historyDeleteBtn}
                                                                onPress={() => handleDeleteSession(session.id)}
                                                                hitSlop={8}
                                                            >
                                                                <IconSymbol name="trash" size={18} color={GIFTYY_THEME.colors.gray300} />
                                                            </Pressable>
                                                        </View>
                                                    ))}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </>
                                )}
                            </View>
                        ) : (
                            <>
                                {messages.map((msg) => (
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
                                                {msg.sender === 'ai' && <View style={styles.aiBubbleTail} />}
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
                                                                return renderFormattedText(msg.text);
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

                                        {msg.quickReplies && msg.quickReplies.length > 0 && (
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
                                ))}

                                {messages.length <= 1 && !loading && (
                                    <View style={styles.emptyChatState}>
                                        <View style={styles.recentChatsHeader}>
                                            <Text style={styles.recentChatsTitle}>Continue where you left off</Text>
                                            <Pressable onPress={() => setIsHistoryVisible(true)}>
                                                <Text style={styles.viewAllText}>View All</Text>
                                            </Pressable>
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentChatsScroll} contentContainerStyle={{ gap: 12 }}>
                                            {pastSessions.slice(0, 5).map((session) => (
                                                <Pressable
                                                    key={session.id}
                                                    style={styles.recentChatCard}
                                                    onPress={() => loadPastSession(session)}
                                                >
                                                    <IconSymbol name="message.fill" size={16} color={GIFTYY_THEME.colors.orange} />
                                                    <Text style={styles.recentChatTitle} numberOfLines={1}>
                                                        {session.previewText}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                            {pastSessions.length === 0 && (
                                                <Text style={styles.noHistoryText}>No recent chats found.</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

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
                                        <View style={styles.aiBubbleTail} />
                                        <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                                            <ThinkingDots />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                    </ScrollView>

                    {/* Suggestions Carousel - Now inside the white container */}
                    <View style={[
                        styles.suggestionsRow,
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
                    </View>
                </View>

                {/* Mentions Dropdown */}
                {showMentions && filteredRecipients.length > 0 && (
                    <View style={styles.mentionDropdown}>
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
                                            {r.firstName[0]}{r.lastName ? r.lastName[0] : ''}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.mentionName}>{r.firstName} {r.lastName || ''}</Text>
                                        {r.relationship && <Text style={styles.mentionSubtext}>{r.relationship}</Text>}
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Plus Menu Overlay */}
                {showMenu && (
                    <Pressable
                        style={styles.fullScreenOverlay}
                        onPress={handleToggleMenu}
                    />
                )}
                {/* Navigation Menu (Plus Button) */}
                {showMenu && (
                    <View style={[styles.navMenu]}>
                        <Pressable style={styles.navMenuItem} onPress={handleHistoryPress}>
                            <IconSymbol name="clock.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.navMenuText}>Chat History</Text>
                        </Pressable>
                        <Pressable style={styles.navMenuItem} onPress={() => handleNavPress('/(buyer)/(tabs)/shop')}>
                            <IconSymbol name="gift.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.navMenuText}>Shop</Text>
                        </Pressable>
                        <Pressable style={styles.navMenuItem} onPress={() => handleNavPress('/(buyer)/(tabs)/recipients')}>
                            <IconSymbol name="person.2.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.navMenuText}>Recipients</Text>
                        </Pressable>
                        <Pressable style={styles.navMenuItem} onPress={() => handleNavPress('/(buyer)/(tabs)/memory')}>
                            <IconSymbol name="camera.fill" size={20} color={GIFTYY_THEME.colors.primary} />
                            <Text style={styles.navMenuText}>Memories</Text>
                        </Pressable>
                    </View>
                )}

                <View style={[styles.inputWrapper, isExpanded && { marginTop: -12, marginBottom: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                    <Pressable style={styles.plusButton} onPress={handleToggleMenu}>
                        <IconSymbol name={showMenu ? "xmark" : "line.3.horizontal"} size={24} color={GIFTYY_THEME.colors.gray600} />
                    </Pressable>
                    <View style={styles.textInputContainer}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder={"Ask Giftyy (Use @ to tag)"}
                            placeholderTextColor={GIFTYY_THEME.colors.gray500}
                            onChangeText={handleTextChange}
                            onSelectionChange={handleSelectionChange}
                            onFocus={handleFocus}
                            onSubmitEditing={() => handleSubmit()}
                            returnKeyType="send"
                        >
                            {renderFormattedText(text, true)}
                        </TextInput>
                    </View>
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
                                name="paperplane.fill"
                                size={24}
                                color={text.trim() ? GIFTYY_THEME.colors.orange : GIFTYY_THEME.colors.gray400}
                            />
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    thinkingDotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 4 },
    thinkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GIFTYY_THEME.colors.primary },
    input: { flex: 1, minHeight: 40, maxHeight: 120, color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Regular', fontSize: 16 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
    container: { width: '100%', zIndex: 10, overflow: 'hidden' },
    contentContainer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0 },
    expandedMain: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: GIFTYY_THEME.colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, flex: 1 },
    expandedHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray50 },
    headerTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text, marginBottom: 2 },
    headerSubtitle: { fontSize: 13, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray500, lineHeight: 18 },
    headerCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: GIFTYY_THEME.colors.gray50, alignItems: 'center', justifyContent: 'center' },
    tabsWrapper: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0, gap: 20, backgroundColor: '#FFFFFF' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8, position: 'relative' },
    activeTabButton: { backgroundColor: 'transparent' },
    tabButtonText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray400 },
    activeTabButtonText: { color: GIFTYY_THEME.colors.text, fontFamily: 'Outfit-Bold' },
    activeTabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: GIFTYY_THEME.colors.orange, borderRadius: 3 },
    chatArea: { flex: 1 },
    chatContent: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16 },
    messageContainer: { marginBottom: 20, maxWidth: '82%', flexShrink: 0 },
    aiMessageContainer: { alignSelf: 'flex-start' },
    userMessageContainer: { alignSelf: 'flex-end' },
    aiMessageRow: { flexDirection: 'row', alignItems: 'flex-end' },
    aiAvatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: GIFTYY_THEME.colors.gray50, marginRight: 10, overflow: 'hidden', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100 },
    messageAvatar: { width: '100%', height: '100%' },
    bubbleWrapper: { position: 'relative', flexShrink: 1 },
    aiBubbleTail: { position: 'absolute', bottom: 12, left: -6, width: 12, height: 12, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }], borderLeftWidth: 1, borderBottomWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, zIndex: -1 },
    messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, ...GIFTYY_THEME.shadows.sm },
    aiBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, borderBottomLeftRadius: 4 },
    userBubble: { backgroundColor: GIFTYY_THEME.colors.orange, borderBottomRightRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 22, fontFamily: 'Outfit-Medium' },
    aiMessageText: { color: GIFTYY_THEME.colors.text },
    userMessageText: { color: '#FFFFFF' },
    recommendationCarousel: { marginTop: 0, marginHorizontal: -16 },
    recommendationScrollContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 12, alignItems: 'flex-start' },
    recommendationGroup: { marginTop: 16, marginBottom: 8, marginLeft: 0, flexShrink: 0 },
    recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 46, marginBottom: 12 },
    recommendationHeaderText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
    followupContainer: { marginLeft: 46, marginTop: 8 },
    followupBubble: { backgroundColor: '#F8F9FA', borderColor: GIFTYY_THEME.colors.gray100, borderWidth: 1, borderTopLeftRadius: 4 },
    actionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: GIFTYY_THEME.colors.orange, ...GIFTYY_THEME.shadows.sm },
    actionButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: GIFTYY_THEME.colors.orange },
    actionButtonPressed: { opacity: 0.8 },
    actionButtonText: { fontSize: 14, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text },
    historyContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    historyHeaderText: { fontSize: 18, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text },
    historyNewChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, ...GIFTYY_THEME.shadows.sm },
    historyNewChatBtnText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.primary, marginLeft: 4 },
    historySearchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: GIFTYY_THEME.colors.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 },
    historySearchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.text, padding: 0 },
    historyGroupTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.gray400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    historyItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, padding: 4, ...GIFTYY_THEME.shadows.sm, borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray50 },
    historyItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
    historyIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    historyItemTitle: { fontSize: 15, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text, marginBottom: 6, lineHeight: 20 },
    historyItemDesc: { fontSize: 13, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray500 },
    historyItemDate: { fontSize: 12, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray400, marginRight: 12 },
    historyEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    historyEmptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    historyEmptyTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: GIFTYY_THEME.colors.text, marginBottom: 8, textAlign: 'center' },
    historyEmptyDesc: { fontSize: 14, fontFamily: 'Outfit-Medium', color: GIFTYY_THEME.colors.gray500, textAlign: 'center', lineHeight: 20 },
    typingIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, ...GIFTYY_THEME.shadows.sm, marginLeft: 16, marginBottom: 16, },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GIFTYY_THEME.colors.gray400 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
        gap: 8,
    },
    plusButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 44,
        maxHeight: 120,
        justifyContent: 'center'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0
    },
    sendButtonDisabled: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        opacity: 0.5
    },
    actionMenu: {
        position: 'absolute',
        bottom: 70, // Positioned right above the plus button
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
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: GIFTYY_THEME.colors.gray100,
    },
    suggestionsScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    suggestionChip: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    suggestionChipPressed: {
        backgroundColor: GIFTYY_THEME.colors.gray100,
    },
    suggestionText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.text,
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
    emptyChatState: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 32,
        paddingHorizontal: 20,
    },
    recentChatsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    recentChatsTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: GIFTYY_THEME.colors.text,
    },
    viewAllText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.primary,
    },
    recentChatsScroll: {
        flexGrow: 0,
        marginBottom: 24,
    },
    recentChatCard: {
        width: 140,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
        ...GIFTYY_THEME.shadows.sm,
    },
    recentChatTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.text,
        marginTop: 12,
        lineHeight: 20,
    },
    noHistoryText: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: GIFTYY_THEME.colors.gray400,
        fontStyle: 'italic',
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
    }
});

console.log("END OF HOME AI INTERFACE MODULE EVALUATION!");

