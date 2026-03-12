/**
 * Server Error Page
 * Full-page route for server connectivity errors
 */

import { ServerErrorScreen } from '@/components/errors/ServerErrorScreen';
import { useRouter } from 'expo-router';
import React from 'react';

export default function ServerErrorPage() {
    const router = useRouter();

    const handleRetry = () => {
        // Try to go back to home and reload
        router.replace('/(buyer)/(tabs)');
    };

    return (
        <ServerErrorScreen
            onRetry={handleRetry}
            title="We're experiencing technical difficulties"
            message="Our servers are temporarily unavailable. We're working to resolve this as quickly as possible."
        />
    );
}
