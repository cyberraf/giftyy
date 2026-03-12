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
	activeRecipient: Recipient | null;
	activeRecipientNextOccasion: UpcomingOccasion | null;
	upcomingOccasions: UpcomingOccasion[];
	suggestions: HomeGiftSuggestion[];
	suggestionsLoading: boolean;
	myProfileId: string | null;
	myProfileOccasions: any[];
	myPreferences: any | null;
	circleOccasions: any[];
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
	const { activeRecipientId } = useAppStore();
	const [myProfileId, setMyProfileId] = useState<string | null>(null);

	const [myProfileOccasions, setMyProfileOccasions] = useState<any[]>([]);
	const [circleOccasions, setCircleOccasions] = useState<any[]>([]);
	const [myPreferences, setMyPreferences] = useState<any | null>(null);

	// Fetch current user's profile, occasions, and preferences
	const fetchMyData = useCallback(async () => {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return;

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

			if (occs) {
				const localized = occs.map(o => ({
					...o,
					label: o.label || o.title || 'Occasion'
				}));
				setMyProfileOccasions(localized);
			}

			// 3. Get preferences for self
			const { data: prefs } = await supabase
				.from('recipient_preferences')
				.select('*')
				.eq('recipient_profile_id', rp.id)
				.maybeSingle();

			if (prefs) {
				setMyPreferences(dbRowToPreferences(prefs));
			}
		}
	}, []);

	useEffect(() => {
		fetchMyData();
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
		const fetchCircleOccasions = async () => {
			const { data: { user: currentUser } } = await supabase.auth.getUser();
			if (!currentUser) return;

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

			setCircleOccasions(allOccs);
		};

		fetchCircleOccasions();
	}, [visibleRecipients, myProfileId]);

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
	}, [visibleRecipients, myProfileId, circleOccasions]);

	const activeRecipientNextOccasion = useMemo<UpcomingOccasion | null>(() => {
		if (!activeRecipient) return null;
		return getNextBirthdayOccasion(activeRecipient);
	}, [activeRecipient]);

	const refreshOccasions = async () => {
		await Promise.all([refreshRecipients(), fetchMyData()]);
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
		suggestions,
		suggestionsLoading,
		myProfileId,
		myProfileOccasions,
		myPreferences,
		circleOccasions,
		refreshOccasions,
	};
}

