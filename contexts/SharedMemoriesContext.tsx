import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { uploadMediaToStorage, deleteMediaFromStorage, type MediaType } from '@/lib/media-storage';

export type SharedMemory = {
	id: string;
	userId: string;
	mediaType: 'video' | 'photo';
	fileUrl: string;
	title: string;
	createdAt: string;
	updatedAt: string;
};

type SharedMemoriesContextValue = {
	sharedMemories: SharedMemory[];
	loading: boolean;
	addSharedMemory: (
		localFileUri: string,
		title: string,
		mediaType: 'video' | 'photo'
	) => Promise<{ memory: SharedMemory | null; error: Error | null }>;
	deleteSharedMemory: (id: string) => Promise<{ error: Error | null }>;
	refreshSharedMemories: () => Promise<void>;
};

const SharedMemoriesContext = createContext<SharedMemoriesContextValue | undefined>(undefined);

// Helper function to convert database row (snake_case) to SharedMemory (camelCase)
function dbRowToSharedMemory(row: any): SharedMemory {
	return {
		id: row.id,
		userId: row.user_id,
		mediaType: row.media_type || 'video',
		fileUrl: row.file_url,
		title: row.title,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export function SharedMemoriesProvider({ children }: { children: React.ReactNode }) {
	const [sharedMemories, setSharedMemories] = useState<SharedMemory[]>([]);
	const [loading, setLoading] = useState(true);
	const { user } = useAuth();

	// Fetch shared memories from Supabase
	const refreshSharedMemories = useCallback(async () => {
		if (!user) {
			setSharedMemories([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const { data, error } = await supabase
				.from('shared_memories')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Error fetching shared memories:', error);
				return;
			}

			const fetchedMemories = (data || []).map(dbRowToSharedMemory);
			setSharedMemories(fetchedMemories);
		} catch (err) {
			console.error('Unexpected error fetching shared memories:', err);
		} finally {
			setLoading(false);
		}
	}, [user]);

	// Fetch shared memories when user changes
	useEffect(() => {
		refreshSharedMemories();
	}, [refreshSharedMemories]);

	const addSharedMemory = useCallback(
		async (
			localFileUri: string,
			title: string,
			mediaType: 'video' | 'photo'
		): Promise<{ memory: SharedMemory | null; error: Error | null }> => {
			if (!user) {
				return { memory: null, error: new Error('User not authenticated') };
			}

			try {
				// Upload media to Supabase Storage
				const { url: fileUrl, error: uploadError } = await uploadMediaToStorage(
					localFileUri,
					user.id,
					mediaType
				);

				if (uploadError || !fileUrl) {
					return { memory: null, error: uploadError || new Error('Failed to upload media') };
				}

				// Create shared memory record in database
				const { data, error } = await supabase
					.from('shared_memories')
					.insert({
						user_id: user.id,
						media_type: mediaType,
						file_url: fileUrl,
						title: title.trim(),
					})
					.select()
					.single();

				if (error) {
					console.error('Error creating shared memory:', error);
					return { memory: null, error: new Error(error.message) };
				}

				const memory = dbRowToSharedMemory(data);

				// Refresh the list
				await refreshSharedMemories();

				return { memory, error: null };
			} catch (err: any) {
				console.error('Unexpected error adding shared memory:', err);
				return { memory: null, error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshSharedMemories]
	);

	const deleteSharedMemory = useCallback(
		async (id: string): Promise<{ error: Error | null }> => {
			if (!user) {
				return { error: new Error('User not authenticated') };
			}

			try {
				// Get shared memory to delete the file from storage
				const { data: memoryData, error: fetchError } = await supabase
					.from('shared_memories')
					.select('file_url, media_type')
					.eq('id', id)
					.eq('user_id', user.id)
					.single();

				if (fetchError) {
					return { error: new Error(fetchError.message) };
				}

				// Delete media file from storage
				if (memoryData.file_url && memoryData.media_type) {
					const { error: mediaDeleteError } = await deleteMediaFromStorage(
						memoryData.file_url,
						memoryData.media_type as MediaType
					);
					if (mediaDeleteError) {
						console.warn('Error deleting media file from storage:', mediaDeleteError);
						// Continue with database deletion even if storage deletion fails
					}
				}

				// Delete from database
				const { error } = await supabase
					.from('shared_memories')
					.delete()
					.eq('id', id)
					.eq('user_id', user.id);

				if (error) {
					console.error('Error deleting shared memory:', error);
					return { error: new Error(error.message) };
				}

				// Refresh the list
				await refreshSharedMemories();
				return { error: null };
			} catch (err: any) {
				console.error('Unexpected error deleting shared memory:', err);
				return { error: err instanceof Error ? err : new Error(String(err)) };
			}
		},
		[user, refreshSharedMemories]
	);

	const value = useMemo(
		() => ({
			sharedMemories,
			loading,
			addSharedMemory,
			deleteSharedMemory,
			refreshSharedMemories,
		}),
		[sharedMemories, loading, addSharedMemory, deleteSharedMemory, refreshSharedMemories]
	);

	return <SharedMemoriesContext.Provider value={value}>{children}</SharedMemoriesContext.Provider>;
}

export function useSharedMemories() {
	const ctx = useContext(SharedMemoriesContext);
	if (ctx === undefined) {
		throw new Error('useSharedMemories must be used within SharedMemoriesProvider');
	}
	return ctx;
}

