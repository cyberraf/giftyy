import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'video-messages';
const PUBLIC_BUCKET_PATH = `/storage/v1/object/public/${BUCKET_NAME}/`;
const SIGNED_BUCKET_PATH = `/storage/v1/object/sign/${BUCKET_NAME}/`;

function extractFilePathFromStorageUrl(url: string): string | null {
	const decodePath = (raw: string) => {
		const clean = raw.split('?')[0];
		try {
			return decodeURIComponent(clean);
		} catch {
			return clean;
		}
	};

	if (url.includes(PUBLIC_BUCKET_PATH)) {
		const start = url.indexOf(PUBLIC_BUCKET_PATH) + PUBLIC_BUCKET_PATH.length;
		return decodePath(url.slice(start));
	}

	if (url.includes(SIGNED_BUCKET_PATH)) {
		const start = url.indexOf(SIGNED_BUCKET_PATH) + SIGNED_BUCKET_PATH.length;
		return decodePath(url.slice(start));
	}

	// Fallback: if the URL contains /video-messages/, try to grab everything after it
	const fallbackIdx = url.indexOf(`/${BUCKET_NAME}/`);
	if (fallbackIdx !== -1) {
		const start = fallbackIdx + (`/${BUCKET_NAME}/`.length);
		return decodePath(url.slice(start));
	}

	return null;
}

/**
 * Ensures Supabase Storage video URLs are playable by generating signed URLs when needed.
 * Falls back to the original URL for non-Supabase or already-public assets.
 */
export function useSignedVideoUrl(videoUrl?: string | null): string | null {
	const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!videoUrl) {
			setResolvedUrl(null);
			return;
		}

		// Fast path: if the URL is already public or already signed, don't add latency
		// by requesting a new signed URL.
		if (videoUrl.includes(PUBLIC_BUCKET_PATH) || videoUrl.includes(SIGNED_BUCKET_PATH)) {
			setResolvedUrl(videoUrl);
			return;
		}

		let isMounted = true;

		const resolveUrl = async () => {
			// Only sign Supabase storage URLs
			const filePath = extractFilePathFromStorageUrl(videoUrl);
			if (!filePath) {
				isMounted && setResolvedUrl(videoUrl);
				return;
			}

			const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(filePath, 3600);

			if (!isMounted) return;

			if (error || !data?.signedUrl) {
				console.warn('[useSignedVideoUrl] Failed to create signed URL, falling back to original URL', error);
				setResolvedUrl(videoUrl);
			} else {
				setResolvedUrl(data.signedUrl);
			}
		};

		resolveUrl().catch((err) => {
			console.error('[useSignedVideoUrl] Unexpected error generating signed URL', err);
			isMounted && setResolvedUrl(videoUrl);
		});

		return () => {
			isMounted = false;
		};
	}, [videoUrl]);

	return resolvedUrl;
}

