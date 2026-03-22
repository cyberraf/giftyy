import { useAuth, isOAuthFlowActive } from '@/contexts/AuthContext';
import { processDeepLink } from '@/lib/deep-link';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
	const { user, loading, isOffline, syncAuth } = useAuth();
	const router = useRouter();
	const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);
	const [hasCheckedInitialUrl, setHasCheckedInitialUrl] = useState(false);
	const handledUrlRef = useRef<string | null>(null);

	useEffect(() => {
		const handleUrl = async (url: string) => {
			// Avoid processing the same URL twice
			if (handledUrlRef.current === url) return;
			handledUrlRef.current = url;

			// Skip if signInWithGoogle is handling its own OAuth flow
			if (isOAuthFlowActive()) return;

			setIsHandlingDeepLink(true);

			const result = await processDeepLink(url, syncAuth);

			switch (result.type) {
				case 'password_reset':
					router.replace({
						pathname: '/(auth)/reset-password',
						params: { deepLinkUrl: url },
					});
					return;

				case 'oauth_success':
					router.push('/(buyer)/(tabs)');
					setTimeout(() => router.replace('/(buyer)/(tabs)'), 100);
					return;

				case 'oauth_error':
					router.replace('/(auth)/login');
					return;

				case 'error':
					if (__DEV__) console.warn('[Index] Deep link error:', result.message);
					break;

				case 'ignored':
					break;
			}

			setIsHandlingDeepLink(false);
		};

		// Check for initial URL (app opened via deep link)
		const urlCheckTimeout = setTimeout(() => {
			if (!hasCheckedInitialUrl) {
				setHasCheckedInitialUrl(true);
				setIsHandlingDeepLink(false);
			}
		}, 5000);

		Linking.getInitialURL()
			.then((url) => {
				clearTimeout(urlCheckTimeout);
				setHasCheckedInitialUrl(true);
				if (url) {
					handleUrl(url);
				} else {
					setIsHandlingDeepLink(false);
				}
			})
			.catch(() => {
				clearTimeout(urlCheckTimeout);
				setHasCheckedInitialUrl(true);
				setIsHandlingDeepLink(false);
			});

		// Listen for URL changes while app is open
		const subscription = Linking.addEventListener('url', (event) => {
			if (event.url) handleUrl(event.url);
		});

		return () => {
			clearTimeout(urlCheckTimeout);
			subscription.remove();
		};
	}, [router, syncAuth]); // eslint-disable-line react-hooks/exhaustive-deps

	// Show loading while checking initial URL or handling deep link
	if ((loading || isHandlingDeepLink || !hasCheckedInitialUrl) && !isOffline) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
				<ActivityIndicator size="large" color="#f75507" />
			</View>
		);
	}

	if (user) {
		return <Redirect href="/(buyer)/(tabs)" />;
	}

	return <Redirect href="/(auth)/login" />;
}
