import * as Contacts from 'expo-contacts';
import * as Linking from 'expo-linking';
import { normalizePhoneInput } from './phone';

export interface GiftyyContact {
    id: string;
    name: string;
    phone?: string;
    emails?: string[];
    imageUri?: string;
    isGiftyyUser?: boolean;
}

/**
 * Helper to open the app's system settings.
 * Used when permissions are denied and we can't ask again.
 */
export const openContactSettings = async () => {
    try {
        await Linking.openSettings();
    } catch (error) {
        console.error('[Contacts] Error opening settings:', error);
    }
};

/**
 * Normalizes a phone number for matching.
 * Strips all non-digit characters and ensures it starts with + if it's potentially international.
 */
export const normalizeForMatching = (phone: string): string => {
    return phone.replace(/\D/g, '');
};

/**
 * Requests contact permissions and fetches the contact list.
 * Normalizes contacts for Giftyy's use.
 */
export const getNormalizedContacts = async (): Promise<GiftyyContact[]> => {
    // Defensive check: Verify if the native module is actually available
    if (!Contacts || typeof Contacts.getContactsAsync !== 'function') {
        console.error('[Contacts] Native module ExpoContacts is not available. Please rebuild your dev client.');
        throw new Error('Contacts feature is not available in this build. Please update your app.');
    }

    const { status, canAskAgain } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
        const error = new Error('Permission to access contacts was denied') as any;
        error.canAskAgain = canAskAgain;
        error.status = status;
        throw error;
    }

    const { data } = await Contacts.getContactsAsync({
        fields: [
            Contacts.Fields.Emails,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Image,
        ],
    });

    if (data.length === 0) {
        return [];
    }

    return data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
            const primaryPhone = contact.phoneNumbers?.[0]?.number;
            return {
                id: contact.id,
                name: contact.name,
                phone: primaryPhone ? normalizePhoneInput(primaryPhone) : undefined,
                emails: contact.emails?.map(e => e.email).filter(Boolean) as string[],
                imageUri: contact.image?.uri,
                isGiftyyUser: false, // Will be updated after matching
            };
        });
};
