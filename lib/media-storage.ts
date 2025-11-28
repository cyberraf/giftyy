// Generic media storage helper for videos and photos
// Use legacy API to avoid deprecation warnings
// TODO: Migrate to new File/Directory API when available
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export type MediaType = 'video' | 'photo';

/**
 * Upload a media file (video or photo) to Supabase Storage
 * @param localUri - Local file URI of the media
 * @param userId - User ID who owns the media
 * @param mediaType - Type of media ('video' or 'photo')
 * @returns Public URL of the uploaded media
 */
export async function uploadMediaToStorage(
	localUri: string,
	userId: string,
	mediaType: MediaType
): Promise<{ url: string; error: Error | null }> {
	try {
		// Generate a unique filename
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 15);
		const extension = mediaType === 'video' ? 'mp4' : 'jpg';
		const folder = mediaType === 'video' ? 'video-messages' : 'shared-memories';
		const filename = `${userId}/${timestamp}-${randomId}.${extension}`;

		// Read file as base64 using expo-file-system legacy API
		const fileUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
		const base64 = await FileSystem.readAsStringAsync(fileUri, {
			encoding: FileSystem.EncodingType.Base64,
		});

		// Convert base64 to ArrayBuffer
		const binaryString = atob(base64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const byteArray = bytes;

		// Determine content type based on media type
		const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

		// Upload to Supabase Storage using ArrayBuffer
		const { data, error } = await supabase.storage
			.from(folder)
			.upload(filename, byteArray, {
				contentType,
				upsert: false,
			});

		if (error) {
			console.error(`Error uploading ${mediaType}:`, error);
			return { url: '', error: new Error(error.message) };
		}

		// Get public URL
		const { data: urlData } = supabase.storage
			.from(folder)
			.getPublicUrl(data.path);

		return { url: urlData.publicUrl, error: null };
	} catch (err: any) {
		console.error(`Unexpected error uploading ${mediaType}:`, err);
		return { url: '', error: err instanceof Error ? err : new Error(String(err)) };
	}
}

/**
 * Delete a media file from Supabase Storage
 * @param mediaUrl - Public URL of the media file
 * @param mediaType - Type of media ('video' or 'photo')
 * @returns Success status and error (if any)
 */
export async function deleteMediaFromStorage(
	mediaUrl: string,
	mediaType: MediaType
): Promise<{ success: boolean; error: Error | null }> {
	try {
		// Determine folder based on media type
		const folder = mediaType === 'video' ? 'video-messages' : 'shared-memories';

		// Extract the file path from the public URL
		// Supabase public URLs are in format: https://[project].supabase.co/storage/v1/object/public/[folder]/[path]
		const urlParts = mediaUrl.split(`/${folder}/`);
		if (urlParts.length !== 2) {
			return { success: false, error: new Error('Invalid media URL format') };
		}

		const filePath = urlParts[1];

		const { error } = await supabase.storage.from(folder).remove([filePath]);

		if (error) {
			console.error(`Error deleting ${mediaType} from storage:`, error);
			return { success: false, error: new Error(error.message) };
		}

		return { success: true, error: null };
	} catch (err: any) {
		console.error(`Unexpected error deleting ${mediaType} from storage:`, err);
		return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
	}
}

// Re-export video-specific functions for backward compatibility
export async function uploadVideoToStorage(
	localUri: string,
	userId: string
): Promise<{ url: string; error: Error | null }> {
	return uploadMediaToStorage(localUri, userId, 'video');
}

export async function deleteVideoFromStorage(videoUrl: string): Promise<{ success: boolean; error: Error | null }> {
	return deleteMediaFromStorage(videoUrl, 'video');
}

