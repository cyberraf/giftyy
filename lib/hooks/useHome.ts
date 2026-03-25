import { useRecipients, type Recipient } from '@/contexts/RecipientsContext';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { dbRowToPreferences } from '@/types/recipient-preferences';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type UpcomingOccasion = {
	id: string;
	recipientId: string;
	recipientProfileId: string;
	recipientName: string;
	avatarUrl?: string;
	label: string;
	date: string; // ISO date YYYY-MM-DD
	inDays: number;
	isIgnored?: boolean;
};

export type HomeGiftSuggestion = {
	id: string;
	title: string;
	category?: string | null;
	priceRange?: string | null;
	rationale?: string | null;
	sessionId?: string | null;
};

type UseHomeResult = {
	recipients: Recipient[];
	recipientsLoading: boolean;
	initialLoading: boolean;
	activeRecipient: Recipient | null;
	activeRecipientNextOccasion: UpcomingOccasion | null;
	upcomingOccasions: UpcomingOccasion[];
	suggestions: HomeGiftSuggestion[];
	suggestionsLoading: boolean;
	myProfileId: string | null;
	myProfileOccasions: any[];
	myPreferences: any | null;
	circleOccasions: any[];
	ignoredOccasionIds: string[];
	refreshOccasions: () => Promise<void>;
};

/**
 * Compute the next birthday for a recipient (if any) as an upcoming occasion.
 * This mirrors the logic used elsewhere in the app but is scoped for Home.
 */
function getNextBirthdayOccasion(recipient: Recipient): UpcomingOccasion | null {
	if (!recipient.birthDate) return null;

	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const [year, month, day] = recipient.birthDate.split('-').map(Number);
	if (!year || !month || !day) return null;

	const currentYear = now.getFullYear();
	const birthdayThisYear = new Date(currentYear, month - 1, day);
	const birthdayNextYear = new Date(currentYear + 1, month - 1, day);

	let target = birthdayThisYear;
	if (birthdayThisYear < now) {
		target = birthdayNextYear;
	}

	const diffMs = target.getTime() - now.getTime();
	const inDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

	return {
		id: `birthday-${recipient.id}-${target.getFullYear()}`,
		recipientId: recipient.id,
		recipientProfileId: recipient.profileId ?? recipient.id,
		recipientName: recipient.firstName,
		// direction-aware: outgoing → their profile pic from profiles table, incoming → sender's pic
		avatarUrl: recipient.isOutgoing ? recipient.avatarUrl : recipient.senderAvatarUrl,
		label: 'Birthday',
		date: target.toISOString().slice(0, 10),
		inDays,
	};
}

export function useHome(): UseHomeResult {
	const { recipients, loading: recipientsLoading, refreshRecipients } = useRecipients();
	const { activeRecipientId, homeDataCache, setHomeDataCache } = useAppStore();
	
	const hasCache = !!homeDataCache && (Date.now() - homeDataCache.lastFetched < 1000 * 60 * 5); // 5 min cache
	
	const [initialLoading, setInitialLoading] = useState(!hasCache);
	const [profileLoading, setProfileLoading] = useState(!hasCache);
	const [circleOccasionsLoading, setCircleOccasionsLoading] = useState(!hasCache);
	const [myProfileId, setMyProfileId] = useState<string | null>(homeDataCache?.myProfileId || null);

	const [myProfileOccasions, setMyProfileOccasions] = useState<any[]>(homeDataCache?.myProfileOccasions || []);
	const [circleOccasions, setCircleOccasions] = useState<any[]>(homeDataCache?.circleOccasions || []);
	const [ignoredOccasionIds, setIgnoredOccasionIds] = useState<string[]>(homeDataCache?.ignoredOccasionIds || []);
	const [myPreferences, setMyPreferences] = useState<any | null>(homeDataCache?.myPreferences || null);

	// Fetch current user's profile, occasions, and preferences
	const fetchMyData = useCallback(async (forceRefresh = false) => {
		// Skip fetch if cache is still fresh (unless forced)
		if (!forceRefresh && homeDataCache && (Date.now() - homeDataCache.lastFetched < 1000 * 60 * 5)) {
			setProfileLoading(false);
			return;
		}
		setProfileLoading(true);
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			setProfileLoading(false);
			return;
		}

		// 1. Get profile ID
		const { data: rp, error: rpError } = await supabase
			.from('recipient_profiles')
			.select('id')
			.eq('user_id', user.id)
			.maybeSingle();

		if (!rpError && rp) {
			setMyProfileId(rp.id);

			// 2. Get occasions for self
			const { data: occs } = await supabase
				.from('occasions')
				.select('*')
				.eq('recipient_profile_id', rp.id)
				.order('date', { ascending: true });

			let myProfileOccasionsRef = myProfileOccasions;
			if (occs) {
				const localized = occs.map(o => ({
					...o,
					label: o.label || o.title || 'Occasion'
				}));
				setMyProfileOccasions(localized);
				myProfileOccasionsRef = localized;
			}

			// 3. Get preferences for self
			const { data: prefs } = await supabase
				.from('recipient_preferences')
				.select('*')
				.eq('recipient_profile_id', rp.id)
				.maybeSingle();

			if (prefs) {
				const localizedPrefs = dbRowToPreferences(prefs);
				setMyPreferences(localizedPrefs);
				setHomeDataCache({ myPreferences: localizedPrefs, myProfileId: rp.id, myProfileOccasions: myProfileOccasionsRef, lastFetched: Date.now() });
			} else {
				setHomeDataCache({ myProfileId: rp.id, myProfileOccasions: myProfileOccasionsRef, lastFetched: Date.now() });
			}
		}
		setProfileLoading(false);
	}, []);

	useEffect(() => {
		async function init() {
			await fetchMyData();
			// If recipients are already loaded or not needed, we can potentially flip initialLoading here
			// But it's safer to do it in the next effect where we have both recipients and circle occasions
		}
		init();
	}, [fetchMyData]);

	// Restrict Occasion access logic:
	// If a recipient is a Giftyy member (claimed), only show occasions if connection is approved.
	// Phantoms (unclaimed) are always visible.
	const visibleRecipients = useMemo(() => {
		return recipients.filter(r => {
			if (r.isClaimed && r.status !== 'approved') {
				return false;
			}
			return true;
		});
	}, [recipients]);

	const activeRecipient = useMemo(
		() => visibleRecipients.find((r) => r.id === activeRecipientId) || null,
		[visibleRecipients, activeRecipientId],
	);

	// Fetch all occasions for all recipients:
	//   - Occasions created BY the user (covers phantoms and self-created entries)
	//   - Occasions belonging to connected members' profiles (covers shared circle occasions)
	useEffect(() => {
		// Wait for recipients and profile to load before fetching occasions
		// to avoid caching incomplete results
		if (recipientsLoading || profileLoading) return;

		const fetchCircleOccasions = async () => {
			setCircleOccasionsLoading(true);
			const { data: { user: currentUser } } = await supabase.auth.getUser();
			if (!currentUser) {
				setCircleOccasionsLoading(false);
				return;
			}

			// Build list of all recipient_profile_ids from connections
			const connProfileIds = visibleRecipients
				.map(r => r.actualProfileId)
				.filter((id): id is string => !!id && id !== myProfileId);

			let allOccs: any[] = [];

			// 1. Occasions created BY the user (covers all phantom recipients)
			const { data: myCreatedOccs } = await supabase
				.from('occasions')
				.select('*')
				.eq('user_id', currentUser.id);

			if (myCreatedOccs) {
				// Exclude the user's own self-occasions
				const filtered = myProfileId
					? myCreatedOccs.filter(o => o.recipient_profile_id !== myProfileId)
					: myCreatedOccs;
				allOccs = [...filtered];
			}

			// 2. Fetch shared occasions from approved circle members (different creator)
			if (connProfileIds.length > 0) {
				const { data: sharedOccs } = await supabase
					.from('occasions')
					.select('*')
					.in('recipient_profile_id', connProfileIds)
					.neq('user_id', currentUser.id);

				if (sharedOccs) allOccs = [...allOccs, ...sharedOccs];
			}

			// 3. Fetch user's ignored occasions
			const { data: ignoredData } = await supabase
				.from('ignored_occasions')
				.select('occasion_id')
				.eq('user_id', currentUser.id);
			
			const ignoredIds = ignoredData?.map((item: any) => item.occasion_id) || [];
			setIgnoredOccasionIds(ignoredIds);

			setCircleOccasions(allOccs);
			setHomeDataCache({ circleOccasions: allOccs, ignoredOccasionIds: ignoredIds, lastFetched: Date.now() });
			setCircleOccasionsLoading(false);
		};


		fetchCircleOccasions();
	}, [visibleRecipients, myProfileId, recipientsLoading, profileLoading]);

	// Master loading state tracker
	useEffect(() => {
		// Only flip initialLoading to false once ALL critical data sources have finished their first fetch.
		if (!recipientsLoading && !profileLoading && !circleOccasionsLoading) {
			// Small delay to ensure all state updates have settled
			const timer = setTimeout(() => {
				setInitialLoading(false);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [recipientsLoading, profileLoading, circleOccasionsLoading]);

	const upcomingOccasions = useMemo<UpcomingOccasion[]>(() => {
		const all: UpcomingOccasion[] = [];
		const seenIds = new Set<string>();

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		// Helper: compute next occurrence date for recurring occasions
		function getNextOccurrenceDate(dateStr: string, recurring: boolean): { date: Date; inDays: number } | null {
			const parts = dateStr.split('-').map(Number);
			if (parts.length !== 3) return null;
			const [year, month, day] = parts;

			let target: Date;
			if (recurring || year <= 10) {
				// Recurring or sentinel-year: use current/next year
				const thisYear = now.getFullYear();
				target = new Date(thisYear, month - 1, day);
				if (target < now) target = new Date(thisYear + 1, month - 1, day);
			} else {
				target = new Date(year, month - 1, day);
				if (target < now) return null; // past one-time occasion
			}

			const diffMs = target.getTime() - now.getTime();
			const inDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
			return { date: target, inDays };
		}

		// 1. Add DB occasions from circleOccasions (created by user OR shared by connections)
		for (const occ of circleOccasions) {
			// Match recipient by actualProfileId OR by connection id (r.id)
			// OccasionFormModal stores recipientId (connection's r.id) as recipient_profile_id
			const recipient = visibleRecipients.find(r =>
				r.actualProfileId === occ.recipient_profile_id ||
				r.id === occ.recipient_profile_id
			);
			if (!recipient) continue;
			// Skip self
			if (recipient.actualProfileId === myProfileId) continue;

			const recurring = occ.recurring ?? false;
			const next = getNextOccurrenceDate(occ.date, recurring);
			if (!next) continue;

			const key = `${occ.id}`;
			if (seenIds.has(key)) continue;
			seenIds.add(key);

			all.push({
				id: occ.id,
				recipientId: recipient.id,
				recipientProfileId: occ.recipient_profile_id,
				recipientName: recipient.displayName.split(' ')[0],
				// direction-aware: outgoing → their profile pic, incoming → sender's profile pic
				avatarUrl: recipient.isOutgoing ? recipient.avatarUrl : recipient.senderAvatarUrl,
				label: occ.title || occ.label || 'Occasion',
				date: next.date.toISOString().slice(0, 10),
				inDays: next.inDays,
				isIgnored: ignoredOccasionIds.includes(occ.id),
			});
		}

		// 2. Add calculated birthdays for recipients where no DB birthday occasion exists
		for (const recipient of visibleRecipients) {
			if (recipient.actualProfileId === myProfileId) continue;
			if (!recipient.birthDate) continue;

			// Skip if a birthday occasion is already in the list for this recipient
			const hasBirthdayOcc = all.some(a =>
				a.recipientId === recipient.id && a.label.toLowerCase() === 'birthday'
			);
			if (hasBirthdayOcc) continue;

			const nextBirthday = getNextBirthdayOccasion(recipient);
			if (nextBirthday) all.push(nextBirthday);
		}

		return all
			.sort((a, b) => a.inDays - b.inDays)
			.slice(0, 50);
	}, [visibleRecipients, myProfileId, circleOccasions, ignoredOccasionIds]);

	const activeRecipientNextOccasion = useMemo<UpcomingOccasion | null>(() => {
		if (!activeRecipient) return null;
		return getNextBirthdayOccasion(activeRecipient);
	}, [activeRecipient]);

	const refreshOccasions = async () => {
		// Invalidate cache so fetches actually run
		setHomeDataCache({ lastFetched: 0 });
		await Promise.all([refreshRecipients(), fetchMyData(true)]);
	};

	// Gift suggestions for the active recipient
	const [suggestions, setSuggestions] = useState<HomeGiftSuggestion[]>([]);
	const [suggestionsLoading, setSuggestionsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadSuggestions() {
			if (!activeRecipient) {
				setSuggestions([]);
				return;
			}

			setSuggestionsLoading(true);
			try {
				if (!cancelled) {
					setSuggestions([]);
				}
			} catch {
				if (!cancelled) {
					setSuggestions([]);
				}
			} finally {
				if (!cancelled) {
					setSuggestionsLoading(false);
				}
			}
		}

		loadSuggestions();

		return () => {
			cancelled = true;
		};
	}, [activeRecipient?.id]);

	return {
		recipients: visibleRecipients,
		recipientsLoading,
		activeRecipient,
		activeRecipientNextOccasion,
		upcomingOccasions,
		initialLoading,
		suggestions,
		suggestionsLoading,
		myProfileId,
		myProfileOccasions,
		myPreferences,
		circleOccasions,
		ignoredOccasionIds,
		refreshOccasions,
	};
}

