import { useMemo, useState, useEffect } from 'react';
import { useRecipients, type Recipient } from '@/contexts/RecipientsContext';
import { useAppStore } from '@/lib/store/useAppStore';

export type UpcomingOccasion = {
	id: string;
	recipientId: string;
	recipientName: string;
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
};

/**
 * Compute the next birthday for a recipient (if any) as an upcoming occasion.
 * This mirrors the logic used elsewhere in the app but is scoped for Home.
 */
function getNextBirthdayOccasion(recipient: Recipient): UpcomingOccasion | null {
	if (!recipient.birthDate) return null;

	const now = new Date();
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
	const inDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

	return {
		id: `birthday-${recipient.id}-${target.getFullYear()}`,
		recipientId: recipient.id,
		recipientName: recipient.firstName,
		label: 'Birthday',
		date: target.toISOString().slice(0, 10),
		inDays,
	};
}

export function useHome(): UseHomeResult {
	const { recipients, loading: recipientsLoading } = useRecipients();
	const { activeRecipientId } = useAppStore();

	// NOTE: If an "archived" flag is ever added, filter here.
	const visibleRecipients = recipients;

	const activeRecipient = useMemo(
		() => visibleRecipients.find((r) => r.id === activeRecipientId) || null,
		[visibleRecipients, activeRecipientId],
	);

	const upcomingOccasions = useMemo<UpcomingOccasion[]>(() => {
		const all: UpcomingOccasion[] = [];

		for (const recipient of visibleRecipients) {
			const nextBirthday = getNextBirthdayOccasion(recipient);
			if (nextBirthday) {
				all.push(nextBirthday);
			}
		}

		return all
			.sort((a, b) => a.inDays - b.inDays)
			.slice(0, 6);
	}, [visibleRecipients]);

	const activeRecipientNextOccasion = useMemo<UpcomingOccasion | null>(() => {
		if (!activeRecipient) return null;
		return getNextBirthdayOccasion(activeRecipient);
	}, [activeRecipient]);

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
				// TODO: Wire to real recommendation APIs when available.
				// Spec (future):
				// - Find most recent ai_session for this recipient
				// - Find latest recommendation_run for that session
				// - Take top N recommendations and map into HomeGiftSuggestion
				//
				// For now we intentionally return an empty list so the UI
				// can render placeholder cards without any backend dependency.
				if (!cancelled) {
					setSuggestions([]);
				}
			} catch {
				// Swallow errors by design: Home must never crash if
				// recommendation tables / APIs are missing or misconfigured.
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
	};
}

