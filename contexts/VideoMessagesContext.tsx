import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { uploadVideoToStorage, deleteVideoFromStorage } from '@/lib/video-storage';

export type VideoMessage = {
	id: string;
	userId: string;
	orderId?: string;
	title: string;
	videoUrl: string;
	durationSeconds?: number;
	fileSizeBytes?: number;
	direction: 'sent' | 'received';
	createdAt: string;
	updatedAt: string;
};

type VideoMessagesContextValue = {
	videoMessages: VideoMessage[];
	loading: boolean;
	addVideoMessage: (
		localVideoUri: string,
		title: string,
		direction?: 'sent' | 'received',
		orderId?: string,
		durationSeconds?: number,
		fileSizeBytes?: number
	) => Promise<{ videoMessage: VideoMessage | null; error: Error | null }>;
	deleteVideoMessage: (id: string) => Promise<{ error: Error | null }>;
	updateVideoMessageOrderId: (videoMessageId: string, orderId: string) => Promise<{ error: Error | null }>;
	refreshVideoMessages: () => Promise<void>;
};

const VideoMessagesContext = createContext<VideoMessagesContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to VideoMessage (camelCase)
function dbRowToVideoMessage(row: any): VideoMessage {
	return {
		id: row.id,
		userId: row.user_id,
		orderId: row.order_id || undefined,
		title: row.title,
		videoUrl: row.video_url,
		durationSeconds: row.duration_seconds || undefined,
		fileSizeBytes: row.file_size_bytes || undefined,
		direction: row.direction || 'sent',
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function VideoMessagesProvider({ children }: { children: React.ReactNode }) {
	const [videoMessages, setVideoMessages] = useState<VideoMessage[]>([]);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();

	// Fetch video messages from Supabase
	const refreshVideoMessages = useCallback(async () => {
		if (!user) {
			setVideoMessages([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from('video_messages')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error fetching video messages:', error);
				return;
			}

			const fetchedVideos = (data || []).map(dbRowToVideoMessage);
			setVideoMessages(fetchedVideos);
		} catch (err) {
			console.error('Unexpected error fetching video messages:', err);
		} finally {
			setLoading(false);
		}
	}, [user]);

	// Fetch video messages when user changes
	useEffect(() => {
		refreshVideoMessages();
	}, [refreshVideoMessages]);

	const addVideoMessage = useCallback(
		async (
			localVideoUri: string,
			title: string,
			direction: 'sent' | 'received' = 'sent',
			orderId?: string,
			durationSeconds?: number,
			fileSizeBytes?: number
		): Promise<{ videoMessage: VideoMessage | null; error: Error | null }> => {
			if (!user) {
				return { videoMessage: null, error: new Error('User not authenticated') };
			}

			try {
				// Upload video to Supabase Storage
				const { url: videoUrl, error: uploadError } = await uploadVideoToStorage(
					localVideoUri,
					user.id
				);

				if (uploadError || !videoUrl) {
					return { videoMessage: null, error: uploadError || new Error('Failed to upload video') };
				}

				// Create video message record in database
				const { data, error } = await supabase
					.from('video_messages')
					.insert({
						user_id: user.id,
						order_id: orderId || null,
						title: title.trim(),
						video_url: videoUrl,
						duration_seconds: durationSeconds || null,
						file_size_bytes: fileSizeBytes || null,
						direction,
					})
					.select()
					.single();

				if (error) {
					console.error('Error creating video message:', error);
					return { videoMessage: null, error: new Error(error.message) };
				}

				const videoMessage = dbRowToVideoMessage(data);

				// Refresh the list
				await refreshVideoMessages();

				return { videoMessage, error: null };
			} catch (err: any) {
				console.error('Unexpected error adding video message:', err);
				return { videoMessage: null, error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshVideoMessages]
	);

	const deleteVideoMessage = useCallback(
		async (id: string): Promise<{ error: Error | null }> => {
			if (!user) {
				return { error: new Error('User not authenticated') };
			}

			try {
				// Get video message to delete the file from storage
				const { data: videoData, error: fetchError } = await supabase
					.from('video_messages')
					.select('video_url')
					.eq('id', id)
					.eq('user_id', user.id)
					.single();

				if (fetchError) {
					return { error: new Error(fetchError.message) };
				}

				// Delete video file from storage
				if (videoData.video_url) {
					const { error: videoDeleteError } = await deleteVideoFromStorage(videoData.video_url);
					if (videoDeleteError) {
						console.warn('Error deleting video file from storage:', videoDeleteError);
						// Continue with database deletion even if storage deletion fails
					}
				}

				// Delete from database
				const { error } = await supabase
					.from('video_messages')
					.delete()
					.eq('id', id)
					.eq('user_id', user.id);

				if (error) {
					console.error('Error deleting video message:', error);
					return { error: new Error(error.message) };
				}

				// Refresh the list
				await refreshVideoMessages();
				return { error: null };
			} catch (err: any) {
				console.error('Unexpected error deleting video message:', err);
				return { error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshVideoMessages]
	);

	const updateVideoMessageOrderId = useCallback(
		async (videoMessageId: string, orderId: string): Promise<{ error: Error | null }> => {
			if (!user) {
				return { error: new Error('User not authenticated') };
			}

			try {
				const { error } = await supabase
					.from('video_messages')
					.update({ order_id: orderId })
					.eq('id', videoMessageId)
					.eq('user_id', user.id);

				if (error) {
					console.error('Error updating video message order_id:', error);
					return { error: new Error(error.message) };
				}

				// Refresh the list
				await refreshVideoMessages();
				return { error: null };
			} catch (err: any) {
				console.error('Unexpected error updating video message order_id:', err);
				return { error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshVideoMessages]
	);

	const value = useMemo(
		() => ({
			videoMessages,
			loading,
			addVideoMessage,
			deleteVideoMessage,
			updateVideoMessageOrderId,
			refreshVideoMessages,
		}),
		[videoMessages, loading, addVideoMessage, deleteVideoMessage, updateVideoMessageOrderId, refreshVideoMessages]
	);

	return <VideoMessagesContext.Provider value={value}>{children}</VideoMessagesContext.Provider>;
}

export function useVideoMessages() {
	const ctx = useContext(VideoMessagesContext);
	if (ctx === undefined) {
		throw new Error('useVideoMessages must be used within VideoMessagesProvider');
	}
	return ctx;
}

