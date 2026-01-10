// Use legacy API to avoid deprecation warnings
// TODO: Migrate to new File/Directory API when available
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * Upload a video file to Supabase Storage
 * @param localUri - Local file URI of the video
 * @param userId - User ID who owns the video
 * @returns Public URL of the uploaded video, plus any error
 */
export async function uploadVideoToStorage(
	localUri: string,
	userId: string
): Promise<{ url: string; error: Error | null }> {
	try {
		// Generate a unique filename (base name without extension)
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 15);
		const baseFilename = `${userId}/${timestamp}-${randomId}`;
		const videoFilename = `${baseFilename}.mp4`;

		// Read video file as base64 using expo-file-system legacy API
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

		// Upload video to Supabase Storage
		const { data: videoData, error: videoError } = await supabase.storage
			.from('video-messages')
			.upload(videoFilename, byteArray, {
				contentType: 'video/mp4',
				upsert: false,
			});

		if (videoError) {
			console.error('Error uploading video:', videoError);
			return { url: '', error: new Error(videoError.message) };
		}

		// Get public URL for video
		const { data: videoUrlData } = supabase.storage
			.from('video-messages')
			.getPublicUrl(videoData.path);

		const videoUrl = videoUrlData.publicUrl;

		return { url: videoUrl, error: null };
	} catch (err: any) {
		console.error('Unexpected error uploading video:', err);
		return { url: '', error: err instanceof Error ? err : new Error(String(err)) };
	}
}


/**
 * Delete a video file from Supabase Storage
 * @param videoUrl - Public URL of the video file
 * @returns Success status and error (if any)
 */
export async function deleteVideoFromStorage(videoUrl: string): Promise<{ success: boolean; error: Error | null }> {
	try {
		// Extract the file path from the public URL
		// Supabase public URLs are in format: https://[project].supabase.co/storage/v1/object/public/video-messages/[path]
		const urlParts = videoUrl.split('/video-messages/');
		if (urlParts.length !== 2) {
			return { success: false, error: new Error('Invalid video URL format') };
		}

		const filePath = urlParts[1];

		const { error } = await supabase.storage.from('video-messages').remove([filePath]);

		if (error) {
			console.error('Error deleting video from storage:', error);
			return { success: false, error: new Error(error.message) };
		}

		return { success: true, error: null };
	} catch (err: any) {
		console.error('Unexpected error deleting video from storage:', err);
		return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
	}
}


