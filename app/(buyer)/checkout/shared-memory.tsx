import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StepBar from '@/components/StepBar';
import BrandButton from '@/components/BrandButton';
import { useCheckout } from '@/lib/CheckoutContext';
import { useSharedMemories } from '@/contexts/SharedMemoriesContext';
import { BRAND_COLOR } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { Video } from 'expo-av';

export default function SharedMemoryScreen() {
    const router = useRouter();
    const { sharedMemoryId, setSharedMemoryId } = useCheckout();
    const { sharedMemories, loading, refreshSharedMemories } = useSharedMemories();
    const [selectedId, setSelectedId] = useState<string | undefined>(sharedMemoryId);
    const [refreshing, setRefreshing] = useState(false);
    const { bottom } = useSafeAreaInsets();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshSharedMemories();
        } catch (error) {
            console.error('Error refreshing shared memories:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshSharedMemories]);

    const handleContinue = () => {
        setSharedMemoryId(selectedId);
        router.push('/(buyer)/checkout/payment');
    };

    const handleSkip = () => {
        setSharedMemoryId(undefined);
        router.push('/(buyer)/checkout/payment');
    };

    return (
        <View style={styles.container}>
            <StepBar current={5} total={7} label="Add a memory (optional)" />
            
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={BRAND_COLOR}
                        colors={[BRAND_COLOR]}
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Attach a Shared Memory</Text>
                    <Text style={styles.subtitle}>
                        Optionally attach a photo or video from your shared memories to include with your gift.
                    </Text>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={BRAND_COLOR} />
                        <Text style={styles.loadingText}>Loading memories...</Text>
                    </View>
                ) : sharedMemories.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No shared memories yet</Text>
                        <Text style={styles.emptySubtext}>
                            You can create shared memories from the Memory tab to attach them to gifts.
                        </Text>
                        <Text style={styles.emptySubtext}>
                            You can continue without attaching a memory.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.memoriesGrid}>
                        {/* Option to not select any memory */}
                        <Pressable
                            onPress={() => setSelectedId(undefined)}
                            style={[
                                styles.memoryCard,
                                styles.noMemoryCard,
                                !selectedId && styles.selectedCard,
                            ]}
                        >
                            <View style={[styles.memoryIcon, !selectedId && styles.selectedIcon]}>
                                <Text style={[styles.memoryIconText, !selectedId && styles.selectedIconText]}>×</Text>
                            </View>
                            <Text style={[styles.memoryTitle, !selectedId && styles.selectedTitle]}>None</Text>
                        </Pressable>

                        {sharedMemories.map((memory) => (
                            <Pressable
                                key={memory.id}
                                onPress={() => setSelectedId(memory.id)}
                                style={[
                                    styles.memoryCard,
                                    selectedId === memory.id && styles.selectedCard,
                                ]}
                            >
                                {memory.mediaType === 'video' ? (
                                    <Video
                                        source={{ uri: memory.fileUrl }}
                                        style={styles.memoryThumbnail}
                                        resizeMode="cover"
                                        shouldPlay={false}
                                        isMuted={true}
                                        useNativeControls={false}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: memory.fileUrl }}
                                        style={styles.memoryThumbnail}
                                        resizeMode="cover"
                                    />
                                )}
                                {selectedId === memory.id && (
                                    <View style={styles.selectedOverlay}>
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>✓</Text>
                                        </View>
                                    </View>
                                )}
                                <Text style={[styles.memoryTitle, selectedId === memory.id && styles.selectedTitle]} numberOfLines={2}>
                                    {memory.title}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>

            <View style={[styles.footer, { bottom: BOTTOM_BAR_TOTAL_SPACE + bottom, paddingBottom: Math.max(bottom, 16) }]}>
                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                </Pressable>
                <BrandButton
                    title="Continue"
                    onPress={handleContinue}
                    style={styles.continueButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6b7280',
        lineHeight: 22,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: '#6b7280',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    memoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    memoryCard: {
        width: '47%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f9fafb',
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    noMemoryCard: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    selectedCard: {
        borderColor: BRAND_COLOR,
        borderWidth: 3,
    },
    memoryThumbnail: {
        width: '100%',
        height: '75%',
        backgroundColor: '#e5e7eb',
    },
    memoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectedIcon: {
        backgroundColor: BRAND_COLOR,
    },
    memoryIconText: {
        fontSize: 32,
        color: '#9ca3af',
        fontWeight: '300',
    },
    selectedIconText: {
        color: 'white',
    },
    selectedOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: BRAND_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    checkmark: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
    memoryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        padding: 8,
        textAlign: 'center',
    },
    selectedTitle: {
        color: BRAND_COLOR,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    skipButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    skipButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#6b7280',
    },
    continueButton: {
        flex: 1,
    },
});

