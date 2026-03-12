/**
 * Server Error Screen
 * Displayed when backend services are unavailable
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ServerErrorScreenProps = {
    onRetry?: () => void;
    title?: string;
    message?: string;
};

export function ServerErrorScreen({
    onRetry,
    title = "We're experiencing technical difficulties",
    message = "Our servers are temporarily unavailable. We're working to resolve this as quickly as possible."
}: ServerErrorScreenProps) {
    const router = useRouter();

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            // Default: reload the app
            router.replace('/');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>⚠️</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>{title}</Text>

                {/* Message */}
                <Text style={styles.message}>{message}</Text>

                {/* Status */}
                <View style={styles.statusCard}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>We're investigating the issue</Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Help text */}
                <Text style={styles.helpText}>
                    If the problem persists, please check back in a few minutes.
                </Text>
            </View>
        </View>
    );
}

const BRAND_COLOR = '#E07B39';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        maxWidth: 400,
        width: '100%',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FEF3E7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 32,
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3E7',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 32,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: BRAND_COLOR,
        marginRight: 10,
    },
    statusText: {
        fontSize: 14,
        color: '#92400E',
        fontWeight: '600',
    },
    actions: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    secondaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    helpText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
});
