import { supabase } from '@/lib/supabase';

export const DEFAULT_HOLIDAYS = [
    { title: "New Year's Day", date: '0004-01-01', type: 'holiday', recurrence_pattern: 'holiday', recurring: true },
    { title: "Valentine's Day", date: '0004-02-14', type: 'holiday', recurrence_pattern: 'holiday', recurring: true },
    { title: "St. Patrick's Day", date: '0004-03-17', type: 'holiday', recurrence_pattern: 'holiday', recurring: true },
    { title: "Halloween", date: '0004-10-31', type: 'holiday', recurrence_pattern: 'holiday', recurring: true },
    { title: "Christmas Day", date: '0004-12-25', type: 'holiday', recurrence_pattern: 'holiday', recurring: true },
];

/**
 * Seeds default fixed-date holidays for a recipient profile.
 * Safe to call multiple times — only inserts holidays that don't already exist
 * (deduplication based on title + date + recipient_profile_id).
 */
export async function seedDefaultOccasions(userId: string, recipientProfileId: string) {
    try {
        // 1. Fetch existing holiday titles+dates for this profile (correct column name)
        const { data: existing, error: fetchError } = await supabase
            .from('occasions')
            .select('title, date')
            .eq('recipient_profile_id', recipientProfileId)
            .eq('type', 'holiday');

        if (fetchError) throw fetchError;

        const existingKeys = new Set(
            (existing || []).map((r: any) => `${r.title}|${r.date}`)
        );

        // 2. Only prepare holidays that are not already present
        const toInsert = DEFAULT_HOLIDAYS
            .filter(h => !existingKeys.has(`${h.title}|${h.date}`))
            .map(h => ({
                user_id: userId,
                recipient_profile_id: recipientProfileId,
                ...h,
            }));

        if (toInsert.length === 0) {
            console.log('[SEEDING] All default holidays already exist — skipping.');
            return;
        }

        // 3. Insert only the missing ones
        const { error: insertError } = await supabase
            .from('occasions')
            .insert(toInsert);

        if (insertError) throw insertError;

        console.log(`[SEEDING] Seeded ${toInsert.length} missing default holidays for profile ${recipientProfileId}`);
    } catch (error) {
        console.error('[SEEDING] Error seeding default occasions:', error);
    }
}
