import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { VideoMessage } from './VideoMessagesContext';

export type Vault = {
	id: string;
	userId: string;
	name: string;
	description?: string;
	categoryType: string;
	lastCategorizedAt?: string;
	createdAt: string;
	updatedAt: string;
	videos: VideoMessage[];
};

type VaultsContextValue = {
	vaults: Vault[];
	loading: boolean;
	refreshVaults: () => Promise<void>;
};

type VaultRow = {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	category_type: string;
	last_categorized_at: string | null;
	created_at: string;
	updated_at: string;
};

type VaultVideoRow = {
	vault_id: string;
	video_messages: VideoMessageRow | null;
};

type VideoMessageRow = {
	id: string;
	user_id: string;
	order_id: string | null;
	title: string;
	video_url: string;
	duration_seconds: number | null;
	file_size_bytes: number | null;
	direction: 'sent' | 'received';
	created_at: string;
	updated_at: string;
};

const VaultsContext = createContext<VaultsContextValue | undefined>(undefined);

function mapDbVideo(row: VideoMessageRow): VideoMessage {
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

export function VaultsProvider({ children }: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [vaults, setVaults] = useState<Vault[]>([]);
	const [loading, setLoading] = useState(true);

	const refreshVaults = useCallback(async () => {
		if (!user) {
			setVaults([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			const { data: vaultRows, error: vaultError } = await supabase
				.from('vaults')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (vaultError) {
				console.error('Error fetching vaults:', vaultError);
				setVaults([]);
				return;
			}

			if (!vaultRows || vaultRows.length === 0) {
				setVaults([]);
				return;
			}

			const vaultIds = vaultRows.map((row) => row.id);
			const { data: vaultVideoRows, error: vaultVideosError } = await supabase
				.from('vault_videos')
				.select('vault_id, video_messages:video_message_id (*)')
				.in('vault_id', vaultIds);

			if (vaultVideosError) {
				console.error('Error fetching vault videos:', vaultVideosError);
			}

			const videosByVault = new Map<string, VideoMessage[]>();

			(vaultVideoRows || []).forEach((row: VaultVideoRow) => {
				if (!row.video_messages) {
					return;
				}
				const existing = videosByVault.get(row.vault_id) ?? [];
				existing.push(mapDbVideo(row.video_messages));
				videosByVault.set(row.vault_id, existing);
			});

			const normalizedVaults: Vault[] = (vaultRows as VaultRow[]).map((row) => ({
				id: row.id,
				userId: row.user_id,
				name: row.name,
				description: row.description || undefined,
				categoryType: row.category_type,
				lastCategorizedAt: row.last_categorized_at || undefined,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				videos: videosByVault.get(row.id) ?? [],
			}));

			setVaults(normalizedVaults);
		} catch (error) {
			console.error('Unexpected error fetching vaults:', error);
			setVaults([]);
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		refreshVaults();
	}, [refreshVaults]);

	const value = useMemo(
		() => ({
			vaults,
			loading,
			refreshVaults,
		}),
		[vaults, loading, refreshVaults]
	);

	return <VaultsContext.Provider value={value}>{children}</VaultsContext.Provider>;
}

export function useVaults() {
	const ctx = useContext(VaultsContext);
	if (!ctx) {
		throw new Error('useVaults must be used within VaultsProvider');
	}
	return ctx;
}

