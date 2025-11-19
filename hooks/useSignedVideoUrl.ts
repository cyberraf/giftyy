import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PUBLIC_BUCKET_PATH = '/storage/v1/object/public/video-messages/';

function extractFilePathFromPublicUrl(url: string): string | null {
	const idx = url.indexOf(PUBLIC_BUCKET_PATH);
	if (idx === -1) {
		return null;
	}

	const start = idx + PUBLIC_BUCKET_PATH.length;
	const pathWithQuery = url.slice(start);
	const cleanPath = pathWithQuery.split('?')[0];
	try {
		return decodeURIComponent(cleanPath);
	} catch {
		return cleanPath;
	}
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

		let isMounted = true;

		const resolveUrl = async () => {
			// Only sign Supabase public storage URLs
			if (videoUrl.includes(PUBLIC_BUCKET_PATH)) {
				const filePath = extractFilePathFromPublicUrl(videoUrl);
				if (!filePath) {
					isMounted && setResolvedUrl(videoUrl);
					return;
				}

				const { data, error } = await supabase.storage
					.from('video-messages')
					.createSignedUrl(filePath, 3600);

				if (!isMounted) return;

				if (error || !data?.signedUrl) {
					console.warn('[useSignedVideoUrl] Failed to create signed URL, falling back to public URL', error);
					setResolvedUrl(videoUrl);
				} else {
					setResolvedUrl(data.signedUrl);
				}
			} else {
				isMounted && setResolvedUrl(videoUrl);
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

