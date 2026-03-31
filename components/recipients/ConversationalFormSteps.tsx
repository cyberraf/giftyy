/**
 * Conversational Recipient Form Steps
 * Individual steps for the multi-step recipient form
 */

import { ConversationalStep } from '@/components/forms/ConversationalStep';
import { MultiSelectChips } from '@/components/forms/MultiSelectChips';
import { SingleSelectDropdown } from '@/components/forms/SingleSelectDropdown';
import {
    AGE_RANGE_OPTIONS,
    COLLECTING_INTERESTS_OPTIONS,
    CREATIVE_HOBBIES_OPTIONS,
    CULTURAL_BACKGROUND_OPTIONS,
    GENDER_IDENTITY_OPTIONS,
    INDOOR_ACTIVITIES_OPTIONS,
    LANGUAGE_OPTIONS,
    OUTDOOR_ACTIVITIES_OPTIONS,
    PRONOUN_OPTIONS,
    SPORTS_ACTIVITIES_OPTIONS,
    TECH_INTERESTS_OPTIONS,
} from '@/constants/preference-options';
import { formatPhoneField } from '@/lib/utils/phone';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COUNTRY_LIST, getStateOptionsForCountry } from '@/constants/location-options';
import { SelectListModal } from './RecipientFormModal';

type StepProps = {
    formData?: any;
    updateFormData?: (data: any) => void;
    onNext?: (data?: any) => void;
    onBack?: () => void;
    onSkip?: () => void;
    onCancel?: () => void;
    isFirstStep?: boolean;
    isLastStep?: boolean;
    shouldShow?: (data: any) => boolean;
    isSelf?: boolean;
    onSaveAndExit?: (data?: any) => void;
    label?: string;
};

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COUNTRY_CODES } from '@/constants/country-codes';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const BRAND_COLOR = '#f75507';
const GIFTYY_AVATAR = require('@/assets/images/giftyy.png');
/** Invite link - Universal Links open app when installed; otherwise users get web fallback. */
const INVITE_BASE_URL = 'https://giftyy.store/invite';

// ============================================
// SHARED CONSTANTS
// ============================================
export const RELATIONSHIP_CATEGORIES = {
    'Immediate Family': ['Mom', 'Dad', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandmother', 'Grandfather'],
    'Extended Family': ['Aunt', 'Uncle', 'Niece', 'Nephew', 'Cousin', 'Mother-in-Law', 'Father-in-Law', 'Brother-in-Law', 'Sister-in-Law'],
    'Romantic Partners': ['Wife', 'Husband', 'Boyfriend', 'Girlfriend', 'Fiancée', 'Fiancé'],
    'Friends & Others': ['Friend', 'Best Friend', 'Colleague', 'Buddy', 'Other']
};

// ============================================
// STEP 0: Search / Initiate
// ============================================
export function Step0_Search({ formData, updateFormData, onNext, ...props }: StepProps) {
    const { profile } = useAuth();
    const [name, setName] = useState(formData?.firstName || '');
    const [searchMode, setSearchMode] = useState<'phone' | 'email'>(formData?.email ? 'email' : 'phone');
    const [phone, setPhone] = useState(() => {
        const raw = formData?.phone || '';
        const cc = formData?.countryCode || '+1';
        return raw.startsWith(cc) ? raw.substring(cc.length) : raw;
    });
    const [email, setEmail] = useState(formData?.email || '');
    const [countryCode, setCountryCode] = useState(formData?.countryCode || '+1');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [foundProfile, setFoundProfile] = useState<any | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [relationship, setRelationship] = useState(formData?.relationship || '');
    const [customRelationship, setCustomRelationship] = useState('');

    // Flatten relationship categories more compatibly
    const allRelationships = Object.values(RELATIONSHIP_CATEGORIES).reduce((acc, current) => {
        return acc.concat(current);
    }, [] as string[]).filter(r => r !== 'Other');

    const handleInvite = async (type: 'whatsapp' | 'sms' | 'in-app' | 'native') => {
        if (type === 'in-app') {
            handleConnect();
            return;
        }

        setLoading(true);

        let finalProfileId = foundProfile?.id;

        // Ensure we create a profile in the DB so we have an ID for the invite link
        if (!finalProfileId) {
            finalProfileId = await handleConnect(true);
            if (!finalProfileId) {
                setLoading(false);
                return; // Connect failed and set error
            }
        }

        const inviteLink = finalProfileId ? `${INVITE_BASE_URL}/${finalProfileId}` : 'https://giftyy.store';
        const senderName = profile?.first_name || "your friend";

        const message = `Hey there! It's ${senderName} 👋\n\nI want to make sure every gift and celebration between us is truly special 🎁\n\nJoin my private gifting network on Giftyy — tell me what you love and what you're into so I can nail it every time! ✨\n\nTap here to join me in the app:\n${inviteLink}`;

        if (type === 'native') {
            setLoading(false);
            try {
                await Share.share({ message });
            } catch (err) {
                console.error('Share error:', err);
            }

            // If they had an ID initially, connect them now that they've shared
            if (foundProfile?.id) {
                handleConnect();
            } else {
                // Otherwise they were connected silently to get the ID, so just show success
                setShowSuccess(true);
            }
            return;
        }

        let url = '';
        if (type === 'whatsapp') {
            url = `whatsapp://send?text=${encodeURIComponent(message)}`;
            if (foundProfile?.phone) {
                const cleanPhone = foundProfile.phone.replace(/\+/g, '');
                url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            }
        } else {
            const separator = Platform.OS === 'ios' ? '&' : '?';
            url = `sms:${foundProfile?.phone || ''}${separator}body=${encodeURIComponent(message)}`;
        }

        setLoading(false);
        try {
            await Linking.openURL(url);
        } catch (err) {
            console.error('Invite error:', err);
            setError(`Could not open ${type}. Please try another method.`);
        }

        if (foundProfile?.id) {
            handleConnect();
        } else {
            setShowSuccess(true);
        }
    };

    const handleSearch = async () => {
        const contact = searchMode === 'phone'
            ? (phone ? (phone.startsWith(countryCode) ? phone : `${countryCode}${phone}`) : '')
            : email.trim().toLowerCase();

        if (!contact) return;

        const normalizedSelfPhone = profile?.phone ? (profile.phone.startsWith('+') ? profile.phone : `+${profile.phone}`) : null;
        const normalizedContact = contact.startsWith('+') ? contact : `+${contact}`;

        if (
            (profile?.email && contact === profile.email.toLowerCase()) ||
            (normalizedSelfPhone && normalizedContact === normalizedSelfPhone)
        ) {
            setError("You cannot add yourself as a recipient!");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('invite-recipient', {
                body: {
                    phone: searchMode === 'phone' ? contact : undefined,
                    email: searchMode === 'email' ? contact : undefined,
                    senderId: profile?.id,
                    action: 'search'
                }
            });

            if (functionError) throw functionError;

            if (data.success && data.profile) {
                setFoundProfile({
                    ...data.profile,
                    type: data.type
                });
            } else {
                // Not found, but searched. Show invite options for this "new" contact.
                setFoundProfile({
                    full_name: name || (searchMode === 'email' ? email : 'New Friend'),
                    phone: searchMode === 'phone' ? contact : '',
                    email: searchMode === 'email' ? email : '',
                    type: 'new'
                });
            }
        } catch (err: any) {
            console.error('Search error:', err);
            setError('Something went wrong. Let\'s try manually.');
            onNext?.();
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (silentMode = false) => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('invite-recipient', {
                body: {
                    fullName: foundProfile?.full_name || name || 'New Friend',
                    phone: foundProfile?.phone || (searchMode === 'phone' ? (phone.startsWith(countryCode) ? phone : `${countryCode}${phone}`) : ''),
                    email: foundProfile?.email || (searchMode === 'email' ? email : ''),
                    relationship: (relationship === 'Other' ? customRelationship : relationship) || 'Buddy',
                    senderId: profile?.id,
                    profileId: foundProfile?.id,
                    action: 'invite'
                }
            });

            if (functionError) throw functionError;
            if (!data.success) throw new Error(data.error || 'Failed to connect');

            const newProfileId = data.profileId || foundProfile?.id;

            updateFormData?.({
                profileId: newProfileId,
                firstName: (foundProfile?.full_name || name || 'New').split(' ')[0] || '',
                lastName: (foundProfile?.full_name || name || '').split(' ').slice(1).join(' ') || '',
                phone: foundProfile?.phone || (searchMode === 'phone' ? (phone.startsWith(countryCode) ? phone : `${countryCode}${phone}`) : ''),
                email: foundProfile?.email || (searchMode === 'email' ? email : ''),
                countryCode: countryCode,
                relationship: relationship === 'Other' ? customRelationship : relationship,
                existingProfile: foundProfile?.type !== 'new'
            });

            if (!silentMode) {
                setShowSuccess(true);
            }
            return newProfileId;
        } catch (err: any) {
            console.error('Connect error:', err);
            setError(err.message || 'Something went wrong while connecting.');
            return null;
        } finally {
            if (!silentMode) {
                setLoading(false);
            }
        }
    };

    const filteredCountries = COUNTRY_CODES.filter(c =>
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    );

    if (showSuccess) {
        const isMember = foundProfile?.type === 'member';
        return (
            <ConversationalStep
                question={isMember ? "Connected! ✨" : "Invite Sent! 💌"}
                description={isMember
                    ? `We've connected you with ${foundProfile?.full_name || 'your friend'}. We'll let you know as soon as they update their preferences! ✨`
                    : `We've added ${foundProfile?.full_name || 'them'} to your circle. We'll let you know as soon as they've updated their preferences so you can start celebrating them! ✨`
                }
                hideFooter={true}
                onBack={() => setShowSuccess(false)}
                {...props}
            >
                <View style={styles.successContainer}>
                    <View style={styles.successIconBubble}>
                        <IconSymbol name={isMember ? "person.2.fill" : "checkmark.circle.fill"} size={80} color={BRAND_COLOR} />
                    </View>

                    <TouchableOpacity
                        style={styles.mainActionButton}
                        onPress={() => props.onCancel?.()}
                    >
                        <Text style={styles.mainActionButtonText}>Done ✨</Text>
                    </TouchableOpacity>
                </View>
            </ConversationalStep>
        );
    }

    if (foundProfile) {
        return (
            <ConversationalStep
                question={foundProfile.type === 'new' ? "Invite them to Giftyy! ✨" : "Look who I found! ✨"}
                emoji={foundProfile.type === 'new' ? "💌" : "🎉"}
                description={
                    foundProfile.type === 'member'
                        ? `${foundProfile.full_name} is already on Giftyy! Send them an in-app invite to join your gifting circle. 🎁`
                        : foundProfile.type === 'phantom'
                            ? `I found their Giftyy profile! Send them an in-app invite — they'll see it the moment they join. 🔔`
                            : "They're not on Giftyy yet. Let's send them a friendly invite to join the fun! ✨"
                }
                onBack={() => setFoundProfile(null)}
                hideFooter={true}
                {...props}
            >
                <View style={[styles.foundProfileCard, foundProfile.type === 'new' && styles.newContactCard]}>
                    <View style={styles.foundProfileMain}>
                        <View style={styles.foundAvatarContainer}>
                            {foundProfile.avatar_url ? (
                                <Image
                                    source={{ uri: foundProfile.avatar_url }}
                                    style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6' }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.foundAvatarPlaceholder, { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF' }]}>
                                    <Text style={[styles.foundAvatarText, { fontSize: 32 }]}>
                                        {(foundProfile.full_name || '?')[0].toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.foundInfo}>
                            <Text style={styles.foundName}>{foundProfile.full_name}</Text>
                            <Text style={styles.foundType}>
                                {foundProfile.type === 'member'
                                    ? 'A Verified Giftyy Member! ✨'
                                    : foundProfile.type === 'phantom'
                                        ? 'Giftyy Profile (Awaiting Claim) ✨'
                                        : 'A brand new buddy! 🌟'}
                            </Text>
                            {(foundProfile.phone || foundProfile.email) && (
                                <Text style={styles.foundContact}>
                                    {foundProfile.phone || foundProfile.email}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.actionStack}>
                        {foundProfile.type === 'new' ? (
                            // New contact — not on Giftyy yet, use external share
                            <>
                                <TouchableOpacity
                                    style={[styles.connectButton, styles.inviteButton]}
                                    onPress={() => handleInvite('native')}
                                    disabled={loading}
                                >
                                    <View style={styles.buttonContent}>
                                        {loading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text style={styles.connectButtonText}>Invite to Giftyy 🎁</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.manualEntryBtn}
                                    onPress={() => handleConnect()}
                                    disabled={loading}
                                >
                                    <Text style={styles.manualEntryText}>I'll add details myself instead →</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // member or phantom — send in-app invite notification
                            <>
                                <TouchableOpacity
                                    style={styles.inAppInviteButton}
                                    onPress={() => handleInvite('in-app')}
                                    disabled={loading}
                                >
                                    <View style={styles.buttonContent}>
                                        {loading ? (
                                            <ActivityIndicator color={BRAND_COLOR} />
                                        ) : (
                                            <Text style={styles.inAppInviteButtonText}>Connect</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.manualEntryBtn}
                                    onPress={() => handleConnect()}
                                    disabled={loading}
                                >
                                    <Text style={styles.manualEntryText}>Just add them to my circle →</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                <View style={{ gap: 8, marginTop: 16 }}>
                    <TouchableOpacity
                        style={styles.notThemBtn}
                        onPress={() => setFoundProfile(null)}
                    >
                        <Text style={styles.notThemText}>
                            {foundProfile.type === 'new' ? 'Try a different search' : 'Not who I\'m looking for'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.notThemBtn} // Reusing same style for consistency
                        onPress={() => setFoundProfile(null)}
                    >
                        <Text style={styles.backTextBottom}>Back</Text>
                    </TouchableOpacity>
                </View>
            </ConversationalStep>
        );
    }

    return (
        <ConversationalStep
            question="Hi! Who are we celebrating? 🎈"
            description="Enter their name and contact info so I can help you find or create their perfect profile! ✨"
            onNext={handleSearch}
            nextLabel={loading ? "Searching..." : "Look them up! 🔍"}
            hideFooter={true}
            {...props}
        >
            <View style={[styles.inputGroup, { marginBottom: 32 }]}>
                <Text style={styles.inputLabel}>RECIPIENT NAME</Text>
                <TextInput
                    style={styles.bigInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Their first name or nickname"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTACT METHOD</Text>
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, searchMode === 'phone' && styles.toggleButtonActive]}
                        onPress={() => setSearchMode('phone')}
                    >
                        <Text style={[styles.toggleText, searchMode === 'phone' && styles.toggleTextActive]}>Phone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, searchMode === 'email' && styles.toggleButtonActive]}
                        onPress={() => setSearchMode('email')}
                    >
                        <Text style={[styles.toggleText, searchMode === 'email' && styles.toggleTextActive]}>Email</Text>
                    </TouchableOpacity>
                </View>

                {searchMode === 'phone' ? (
                    <View style={styles.phoneInputContainer}>
                        <TouchableOpacity
                            style={styles.countryCodeButton}
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Text style={styles.countryCodeFlag}>
                                {COUNTRY_CODES.find(c => c.code === countryCode)?.flag || '🇺🇸'}
                            </Text>
                            <Text style={styles.countryCodeText}>{countryCode}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        <TextInput
                            style={[styles.bigInput, { flex: 1, borderBottomWidth: 0 }]}
                            value={phone}
                            onChangeText={(text) => setPhone(formatPhoneField(text, countryCode))}
                            placeholder="(555) 000-0000"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                        />
                    </View>
                ) : (
                    <TextInput
                        style={styles.bigInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                )}

                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
                <Text style={styles.inputLabel}>YOUR RELATIONSHIP</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.carouselContent, { paddingLeft: 0 }]}
                    style={{ marginTop: 12 }}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                >
                    {allRelationships.map(option => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.relationshipChip,
                                relationship === option && styles.relationshipChipSelected,
                                { marginBottom: 0, marginRight: 8 }
                            ]}
                            onPress={() => setRelationship(option)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text
                                style={[
                                    styles.relationshipChipText,
                                    relationship === option && styles.relationshipChipTextSelected,
                                ]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[
                            styles.relationshipChip,
                            relationship === 'Other' && styles.relationshipChipSelected,
                            { marginBottom: 0 }
                        ]}
                        onPress={() => setRelationship('Other')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text
                            style={[
                                styles.relationshipChipText,
                                relationship === 'Other' && styles.relationshipChipTextSelected,
                            ]}
                        >
                            Other
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {relationship === 'Other' && (
                    <TextInput
                        style={[styles.bigInput, { marginTop: 16 }]}
                        value={customRelationship}
                        onChangeText={setCustomRelationship}
                        placeholder="Specify relationship..."
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                    />
                )}
            </View>

            <View style={{ marginTop: 40, paddingBottom: 60 }}>
                <TouchableOpacity
                    style={[styles.mainActionButton, loading && styles.buttonDisabled]}
                    onPress={handleSearch}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.mainActionButtonText}>Look them up! 🔍</Text>
                    )}
                </TouchableOpacity>
            </View>


            <Modal
                visible={showCountryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.dragHandle} />
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Text style={styles.closeButton}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search country..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.country}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryOption}
                                    onPress={() => {
                                        setCountryCode(item.code);
                                        setShowCountryPicker(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <Text style={styles.countryFlag}>{item.flag}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.countryName}>{item.country}</Text>
                                    </View>
                                    <Text style={styles.countryCodeBadge}>{item.code}</Text>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.countryList}
                        />
                    </View>
                </View>
            </Modal>
        </ConversationalStep>
    );
}

// ============================================
// STEP 1: Name
// ============================================
export function Step1_Name({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [firstName, setFirstName] = useState(formData?.firstName || '');
    const [lastName, setLastName] = useState(formData?.lastName || '');

    const handleNext = () => {
        const updates = { firstName, lastName };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = { firstName, lastName };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Let's get your profile set up! ✨" : "Let's celebrate someone special in your life!"}
            emoji={isSelf ? "👋" : "💫"}
            description={isSelf ? "Help us get to know you so we can find gifts you'll love." : "Who are we getting to know today?"}
            required
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                    style={styles.textInput}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter first name"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoFocus
                    returnKeyType="next"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name (Optional)</Text>
                <TextInput
                    style={styles.textInput}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter last name"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    returnKeyType="done"
                />
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 2: Relationship
// ============================================
export function Step2_Relationship({ formData, updateFormData, ...props }: StepProps) {
    const [relationship, setRelationship] = useState(formData?.relationship || '');
    const [customRelationship, setCustomRelationship] = useState('');

    const handleNext = () => {
        const finalRelationship = relationship === 'Other' ? customRelationship : relationship;
        const updates = { relationship: finalRelationship };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const finalRelationship = relationship === 'Other' ? customRelationship : relationship;
        const updates = { relationship: finalRelationship };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={`Tell me about your connection with ${formData?.firstName || 'this person'}`}
            emoji="💝"
            required
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            {Object.entries(RELATIONSHIP_CATEGORIES).map(([category, options]) => {
                return (
                    <View key={category} style={styles.categorySection}>
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.carouselContent}
                        >
                            {options.map((option) => {
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.relationshipChip,
                                            relationship === option && styles.relationshipChipSelected,
                                        ]}
                                        onPress={() => setRelationship(option)}
                                    >
                                        <Text
                                            style={[
                                                styles.relationshipChipText,
                                                relationship === option && styles.relationshipChipTextSelected,
                                            ]}
                                        >
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                );
            })}

            {relationship === 'Other' && (
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.textInput}
                        value={customRelationship}
                        onChangeText={setCustomRelationship}
                        placeholder="Specify relationship..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        autoFocus
                    />
                </View>
            )}
        </ConversationalStep>
    );
}

// ============================================
// STEP 3: Mailing Address
// ============================================
export function Step3_Address({ formData, updateFormData, onNext, isSelf, ...props }: StepProps) {
    const [address, setAddress] = useState(formData.preferences?.address || '');
    const [apartment, setApartment] = useState(formData.preferences?.apartment || '');
    const [city, setCity] = useState(formData.preferences?.city || '');
    const [state, setState] = useState(formData.preferences?.state || '');
    const [zip, setZip] = useState(formData.preferences?.zip || '');
    const [country, setCountry] = useState(formData.preferences?.country || 'United States');

    const [countryModalOpen, setCountryModalOpen] = useState(false);
    const [stateModalOpen, setStateModalOpen] = useState(false);

    const stateOptions = useMemo(() => getStateOptionsForCountry(country), [country]);
    const hasStateList = stateOptions.length > 0;

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                address,
                apartment,
                city,
                state,
                country,
                zip,
            },
        };
        updateFormData?.(updates);
        if (onNext) onNext(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                address,
                apartment,
                city,
                state,
                country,
                zip,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    const title = isSelf ? "Where should we send your gifts?" : `Where should we send gifts for ${formData.firstName}?`;
    const subtitle = isSelf ? "Adding a mailing address helps your friends send physical gifts directly to you." : "We'll use this for physical gift deliveries.";

    return (
        <ConversationalStep
            question={title}
            description={subtitle}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
            onBack={props.onBack}
            {...props}
        >
            <View style={{ gap: 16, marginTop: 12 }}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>STREET ADDRESS</Text>
                    <TextInput
                        value={address}
                        onChangeText={setAddress}
                        style={styles.textInput}
                        placeholder="238 Market Street"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>APARTMENT / UNIT (OPTIONAL)</Text>
                    <TextInput
                        value={apartment}
                        onChangeText={setApartment}
                        style={styles.textInput}
                        placeholder="Apt 4B"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>COUNTRY</Text>
                    <TouchableOpacity
                        onPress={() => setCountryModalOpen(true)}
                        style={[styles.textInput, { justifyContent: 'center' }]}
                    >
                        <Text style={{ color: country ? '#2F2318' : 'rgba(47,35,24,0.4)' }}>
                            {country}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>CITY</Text>
                        <TextInput
                            value={city}
                            onChangeText={setCity}
                            style={styles.textInput}
                            placeholder="San Francisco"
                            placeholderTextColor="rgba(47,35,24,0.4)"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>ZIP / POSTAL CODE</Text>
                        <TextInput
                            value={zip}
                            onChangeText={setZip}
                            style={[styles.textInput, { backgroundColor: 'transparent' }]}
                            placeholder="94103"
                            placeholderTextColor="rgba(47,35,24,0.4)"
                            keyboardType="number-pad"
                            autoComplete="off"
                            textContentType="none"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>STATE / PROVINCE</Text>
                    {hasStateList ? (
                        <TouchableOpacity
                            onPress={() => setStateModalOpen(true)}
                            style={[styles.textInput, { justifyContent: 'center' }]}
                        >
                            <Text style={{ color: state ? '#2F2318' : 'rgba(47,35,24,0.4)' }}>
                                {state || 'Select state / province'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TextInput
                            value={state || ''}
                            onChangeText={setState}
                            style={styles.textInput}
                            placeholder="Enter state / province"
                            placeholderTextColor="rgba(47,35,24,0.4)"
                        />
                    )}
                </View>
            </View>

            <SelectListModal
                visible={countryModalOpen}
                title="Select country"
                options={COUNTRY_LIST}
                selectedValue={country}
                searchable
                searchPlaceholder="Search countries…"
                onClose={() => setCountryModalOpen(false)}
                onSelect={(value) => {
                    setCountry(value);
                    setState('');
                    setCountryModalOpen(false);
                }}
            />

            <SelectListModal
                visible={stateModalOpen}
                title="Select state / province"
                options={stateOptions}
                selectedValue={state}
                onClose={() => setStateModalOpen(false)}
                onSelect={(value) => {
                    setState(value);
                    setStateModalOpen(false);
                }}
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 3: Contact (Optional)
// ============================================
export function Step3_Contact({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [phone, setPhone] = useState(() => {
        const raw = formData?.phone || '';
        const cc = formData?.countryCode || '+1';
        return raw.startsWith(cc) ? raw.substring(cc.length) : raw;
    });
    const [email, setEmail] = useState(formData?.email || '');
    const [countryCode, setCountryCode] = useState(formData?.countryCode || '+1');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [checking, setChecking] = useState(false);

    const handleNext = async () => {
        let cleanPhone = phone;
        if (phone.startsWith(countryCode)) {
            cleanPhone = phone.substring(countryCode.length);
        }
        // Build a reliable E.164 phone — digits only then prefix with +
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        const fullPhone = digitsOnly ? `${countryCode}${digitsOnly}` : '';
        // Also keep a bare-digits variant in case the DB row was saved without +
        const bareDigits = fullPhone.replace(/[^\d]/g, '');

        console.log('[Step3_Contact] handleNext — isSelf:', isSelf);
        console.log('[Step3_Contact] Raw phone input:', phone, '→ digitsOnly:', digitsOnly, '/ fullPhone:', fullPhone, '/ bareDigits:', bareDigits);
        console.log('[Step3_Contact] Email:', email);

        if (isSelf) {
            // If we already have a profileId (from the initial load), skip the phantom search
            if (formData?.profileId) {
                console.log('[Step3_Contact] Skipping phantom search, profileId already known:', formData.profileId);
                const updates = { phone: fullPhone, email, countryCode, matchedPhantom: null };
                updateFormData?.(updates);
                props.onNext?.(updates);
                return;
            }

            try {
                setChecking(true);

                // Build OR conditions covering both phone formats and email
                const orConditions: string[] = [];
                if (email) orConditions.push(`email.ilike.${email}`);
                if (fullPhone) orConditions.push(`phone.eq.${fullPhone}`);
                // Also try matching without the '+' prefix
                if (bareDigits && bareDigits !== fullPhone) orConditions.push(`phone.eq.${bareDigits}`);

                console.log('[Step3_Contact] OR conditions:', orConditions);

                if (orConditions.length > 0) {
                    // Search for phantom profiles
                    const { data, error } = await supabase
                        .from('recipient_profiles')
                        .select('*')
                        .is('user_id', null)
                        .eq('is_claimed', false)
                        .or(orConditions.join(','))
                        .limit(1);

                    console.log('[Step3_Contact] Phantom query result:', data, 'error:', error);

                    if (!error && data && data.length > 0) {
                        console.log('[Step3_Contact] ✅ Phantom matched:', data[0].id, data[0].full_name);
                        const updates = {
                            phone: fullPhone,
                            email,
                            countryCode,
                            matchedPhantom: data[0]
                        };
                        updateFormData?.(updates);
                        props.onNext?.(updates);
                        return;
                    } else {
                        console.log('[Step3_Contact] ❌ No phantom matched.');
                    }
                }
            } catch (err) {
                console.error('Error checking phantoms:', err);
            } finally {
                setChecking(false);
            }
        }

        const updates = { phone: fullPhone, email, countryCode, matchedPhantom: null };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        let cleanPhone = phone;
        if (phone.startsWith(countryCode)) {
            cleanPhone = phone.substring(countryCode.length);
        }
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        const fullPhone = digitsOnly ? `${countryCode}${digitsOnly}` : '';
        const updates = { phone: fullPhone, email, countryCode };
        props.onSaveAndExit?.(updates);
    };

    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);

    const filteredCountries = COUNTRY_CODES.filter(c =>
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    );

    return (
        <ConversationalStep
            question={isSelf ? "Confirm your contact details" : `Would you like to save ${formData?.firstName || 'their'} contact details?`}
            emoji="📱"
            description={isSelf ? "This helps friends find your gifting profile! We'll use this to keep your preferences safe." : "Optional - just in case you want to stay connected!"}
            required={isSelf}
            loading={checking}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputContainer}>
                    <TouchableOpacity
                        style={styles.countryCodeButton}
                        onPress={() => setShowCountryPicker(true)}
                    >
                        <Text style={styles.countryCodeFlag}>
                            {selectedCountry?.flag || '🌍'}
                        </Text>
                        <Text style={styles.countryCodeText}>{countryCode}</Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.phoneInput, { backgroundColor: 'transparent' }]}
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhoneField(text, countryCode))}
                        placeholder="123 456 7890"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        keyboardType="phone-pad"
                        autoComplete="off"
                        textContentType="none"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCountryPicker(false)}
                >
                    <TouchableOpacity
                        style={styles.pickerModal}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <View style={styles.dragHandle} />

                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Text style={styles.closeButton}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search country or code..."
                            placeholderTextColor="rgba(47,35,24,0.5)"
                        />

                        <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                            {filteredCountries.map((country, index) => (
                                <TouchableOpacity
                                    key={`${country.code}-${country.country}-${index}`}
                                    style={styles.countryOption}
                                    onPress={() => {
                                        setCountryCode(country.code);
                                        setShowCountryPicker(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <Text style={styles.countryFlag}>{country.flag}</Text>
                                    <Text style={styles.countryName}>{country.country}</Text>
                                    <Text style={styles.countryCodeBadge}>{country.code}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </ConversationalStep>
    );
}

// ============================================
// STEP 3.5: Claim Profile Confirmation
// ============================================
export function Step3_ClaimProfile({ formData, updateFormData, ...props }: StepProps) {
    const phantom = formData?.matchedPhantom;
    const [otp, setOtp] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default to phone; let user switch to email if both exist
    const hasPhone = !!(phantom?.phone);
    const hasEmail = !!(phantom?.email);
    const [usePhone, setUsePhone] = useState(hasPhone);
    const contactMethod = usePhone ? phantom?.phone : phantom?.email;

    console.log('[ClaimProfile] phantom:', phantom);
    console.log('[ClaimProfile] contactMethod:', contactMethod, '| usePhone:', usePhone);

    const handleSendCode = async () => {
        console.log('[ClaimProfile] handleSendCode called, contactMethod:', contactMethod);
        if (!contactMethod) {
            console.warn('[ClaimProfile] ⚠️ No contactMethod — aborting send.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('[ClaimProfile] Invoking verify-profile-otp with action=send...');
            const { data, error: funcError } = await supabase.functions.invoke('verify-profile-otp', {
                body: { contactInfo: contactMethod, action: 'send' }
            });
            console.log('[ClaimProfile] Edge function response:', data, 'error:', funcError);

            // Extract real error body if available
            if (funcError) {
                const body = await (funcError as any).context?.json?.().catch(() => null);
                console.error('[ClaimProfile] Edge function error body:', body);
                throw new Error(body?.error || funcError.message || 'Failed to send code');
            }
            if (!data?.success) throw new Error(data?.error || 'Failed to send code');
            console.log('[ClaimProfile] ✅ Code sent successfully!');
            setCodeSent(true);
        } catch (err: any) {
            console.error('[ClaimProfile] ❌ Error sending code:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        console.log('[ClaimProfile] handleVerify called, otp:', otp);
        if (otp.length !== 6) {
            console.warn('[ClaimProfile] OTP not 6 digits yet:', otp.length);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('[ClaimProfile] Invoking verify-profile-otp with action=verify...');
            const { data, error: funcError } = await supabase.functions.invoke('verify-profile-otp', {
                body: { contactInfo: contactMethod, code: otp, action: 'verify' }
            });
            console.log('[ClaimProfile] Verify response:', data, 'error:', funcError);

            if (funcError || !data?.success) throw new Error(data?.error || 'Invalid or expired code');

            console.log('[ClaimProfile] ✅ Verified! Moving to next step.');
            const updates = { claimMatched: true, verifiedClaim: true };
            updateFormData?.(updates);
            props.onNext?.(updates);
        } catch (err: any) {
            console.error('[ClaimProfile] ❌ Verify error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        const updates = { claimMatched: false };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    if (!phantom) return null;

    const isEmail = contactMethod?.includes('@');
    const maskedContact = isEmail
        ? contactMethod
        : contactMethod?.replace(/(\+\d{1, 3})\d+(\d{4})/, '$1•••••$2');

    return (
        <ConversationalStep
            question={codeSent ? "Verify it's you! 🔐" : "We found your profile! ✨"}
            emoji={codeSent ? "🛡️" : "🎊"}
            description={codeSent
                ? `Enter the 6-digit code sent to ${maskedContact}`
                : "Your friends have already started a gifting profile for you!"}
            loading={loading}
            {...props}
            onNext={codeSent ? handleVerify : handleSendCode}
            nextLabel={codeSent ? "Verify & Claim ✨" : "Send Verification Code"}
        >
            <View style={styles.foundProfileCard}>
                <View style={[styles.profileAvatarLarge, { backgroundColor: BRAND_COLOR }]}>
                    <Text style={styles.avatarTextLarge}>
                        {phantom.full_name?.charAt(0) || '?'}
                    </Text>
                </View>
                <Text style={styles.foundProfileName}>{phantom.full_name}</Text>
                <Text style={styles.foundProfileSubtitle}>
                    {phantom.email || phantom.phone}
                </Text>

                {/* Method picker — only shown before code is sent and when both exist */}
                {!codeSent && hasPhone && hasEmail && (
                    <View style={styles.methodToggleContainer}>
                        <Text style={styles.methodToggleLabel}>Verify via:</Text>
                        <View style={styles.methodToggle}>
                            <TouchableOpacity
                                style={[styles.methodToggleBtn, usePhone && styles.methodToggleBtnActive]}
                                onPress={() => setUsePhone(true)}
                            >
                                <Text style={[styles.methodToggleBtnText, usePhone && styles.methodToggleBtnTextActive]}>
                                    📱 Phone
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.methodToggleBtn, !usePhone && styles.methodToggleBtnActive]}
                                onPress={() => setUsePhone(false)}
                            >
                                <Text style={[styles.methodToggleBtnText, !usePhone && styles.methodToggleBtnTextActive]}>
                                    ✉️ Email
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.methodToggleSub}>
                            Code will be sent to: {maskedContact}
                        </Text>
                    </View>
                )}

                {codeSent ? (
                    <View style={styles.otpContainer}>
                        <TextInput
                            style={styles.otpInput}
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="000000"
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                        />
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <TouchableOpacity style={styles.resendBtn} onPress={handleSendCode} disabled={loading}>
                            <Text style={styles.resendText}>Didn't get a code? Resend</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionStack}>
                        {error && <Text style={[styles.errorText, { marginBottom: 8 }]}>{error}</Text>}
                        <TouchableOpacity style={styles.mainActionButton} onPress={handleSendCode} disabled={loading}>
                            <Text style={styles.mainActionButtonText}>Yes, that's me! Send code</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.notThemBtn} onPress={handleSkip} disabled={loading}>
                            <Text style={styles.notThemText}>No, create a new profile</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ConversationalStep>
    );
}

// ============================================
// STEP 4: Demographics
// ============================================
export function Step4_Demographics({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [ageRange, setAgeRange] = useState(formData?.preferences?.ageRange);
    const [genderIdentity, setGenderIdentity] = useState(formData?.preferences?.genderIdentity || '');
    const [pronouns, setPronouns] = useState(formData?.preferences?.pronouns);
    const [culturalBackground, setCulturalBackground] = useState(formData?.preferences?.culturalBackground || []);
    const [languages, setLanguages] = useState(formData?.preferences?.languagesSpoken || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                ageRange,
                genderIdentity,
                pronouns,
                culturalBackground,
                languagesSpoken: languages,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                ageRange,
                genderIdentity,
                pronouns,
                culturalBackground,
                languagesSpoken: languages,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Hey! Let's start with the basics so I can get to know you." : `Help me understand ${formData?.firstName || 'them'} better`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "✨"}
            description={isSelf ? "This helps me suggest gifts that truly match who you are." : undefined}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <SingleSelectDropdown
                label="Age Range"
                options={AGE_RANGE_OPTIONS}
                selected={ageRange}
                onChange={setAgeRange}
                placeholder="Select age range..."
            />

            <MultiSelectChips
                label="Gender Identity"
                options={GENDER_IDENTITY_OPTIONS}
                selected={genderIdentity ? [genderIdentity] : []}
                onChange={(vals) => setGenderIdentity(vals[0] || '')}
                placeholder="Select gender identity..."
                maxSelections={1}
                allowCustom={true}
            />

            <SingleSelectDropdown
                label="Pronouns"
                options={PRONOUN_OPTIONS}
                selected={pronouns}
                onChange={setPronouns}
                placeholder="Select pronouns..."
            />

            <MultiSelectChips
                label="Cultural Background"
                options={CULTURAL_BACKGROUND_OPTIONS}
                selected={culturalBackground}
                onChange={setCulturalBackground}
                placeholder="Select background..."
            />

            <MultiSelectChips
                label="Languages Spoken"
                options={LANGUAGE_OPTIONS}
                selected={languages}
                onChange={setLanguages}
                placeholder="Select languages..."
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 5a: Interests — Activities
// ============================================
export function Step5a_Interests({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [sports, setSports] = useState(formData?.preferences?.sportsActivities || []);
    const [outdoor, setOutdoor] = useState(formData?.preferences?.outdoorActivities || []);
    const [indoor, setIndoor] = useState(formData?.preferences?.indoorActivities || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                sportsActivities: sports,
                outdoorActivities: outdoor,
                indoorActivities: indoor,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                sportsActivities: sports,
                outdoorActivities: outdoor,
                indoorActivities: indoor,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "What do you love doing?" : `What brings joy to ${formData?.firstName || 'their'} life?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🌟"}
            description={isSelf ? "Sports and activities you enjoy" : "The activities that make them come alive"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Sports & Activities"
                options={SPORTS_ACTIVITIES_OPTIONS}
                selected={sports}
                onChange={setSports}
            />

            <MultiSelectChips
                label="Outdoor Activities"
                options={OUTDOOR_ACTIVITIES_OPTIONS}
                selected={outdoor}
                onChange={setOutdoor}
            />

            <MultiSelectChips
                label="Indoor Activities"
                options={INDOOR_ACTIVITIES_OPTIONS}
                selected={indoor}
                onChange={setIndoor}
            />
        </ConversationalStep>
    );
}

// ============================================
// STEP 5b: Interests — Hobbies & Tech
// ============================================
export function Step5b_Interests({ formData, updateFormData, isSelf, ...props }: StepProps) {
    const [hobbies, setHobbies] = useState(formData?.preferences?.creativeHobbies || []);
    const [tech, setTech] = useState(formData?.preferences?.techInterests || []);
    const [collecting, setCollecting] = useState(formData?.preferences?.collectingInterests || []);

    const handleNext = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                creativeHobbies: hobbies,
                techInterests: tech,
                collectingInterests: collecting,
            },
        };
        updateFormData?.(updates);
        props.onNext?.(updates);
    };

    const handleSaveAndExit = () => {
        const updates = {
            preferences: {
                ...formData?.preferences,
                creativeHobbies: hobbies,
                techInterests: tech,
                collectingInterests: collecting,
            },
        };
        props.onSaveAndExit?.(updates);
    };

    return (
        <ConversationalStep
            question={isSelf ? "Any creative or tech hobbies?" : `Creative side of ${formData?.firstName || 'them'}?`}
            avatarSource={isSelf ? GIFTYY_AVATAR : undefined}
            emoji={isSelf ? undefined : "🌟"}
            description={isSelf ? "Creative, tech, and collecting interests" : "Hobbies, tech, and things they collect"}
            required={false}
            {...props}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
        >
            <MultiSelectChips
                label="Creative Hobbies"
                options={CREATIVE_HOBBIES_OPTIONS}
                selected={hobbies}
                onChange={setHobbies}
            />

            <MultiSelectChips
                label="Tech Interests"
                options={TECH_INTERESTS_OPTIONS}
                selected={tech}
                onChange={setTech}
            />

            <MultiSelectChips
                label="Collecting Interests"
                options={COLLECTING_INTERESTS_OPTIONS}
                selected={collecting}
                onChange={setCollecting}
            />
        </ConversationalStep>
    );
}

// (Steps 6-9 follow similar pattern)

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#9CA3AF',
        marginBottom: 8,
        letterSpacing: 1,
    },
    bigInput: {
        fontSize: 24,
        color: '#1F2937',
        borderBottomWidth: 2,
        borderBottomColor: BRAND_COLOR,
        paddingVertical: 12,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: 'transparent',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    relationshipChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#374151',
    },
    relationshipChipSelected: {
        backgroundColor: BRAND_COLOR,
    },
    relationshipChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    relationshipChipTextSelected: {
        fontWeight: '600',
        color: '#FFFFFF',
    },
    categorySection: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2F2318',
        marginBottom: 12,
    },
    carouselContent: {
        paddingRight: 24,
        gap: 10,
    },
    foundProfileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        marginTop: 12,
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
    },
    profileAvatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: GIFTYY_THEME.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarTextLarge: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
    },
    foundProfileName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
    },
    foundProfileSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    verifiedBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    verifiedText: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '700',
    },
    errorText: {
        color: '#E53E3E',
        fontSize: 13,
        marginTop: 8,
        fontWeight: '600',
    },
    skipSearchBtn: {
        marginTop: 12,
        alignSelf: 'center',
        padding: 8,
    },
    skipSearchText: {
        fontSize: 14,
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '700',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    countryCodeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderBottomWidth: 2,
        borderBottomColor: BRAND_COLOR,
    },
    countryCodeFlag: {
        fontSize: 20,
    },
    countryCodeText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: 'transparent',
    },
    dropdownArrow: {
        fontSize: 10,
        color: '#9CA3AF',
        marginLeft: 2,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    pickerModal: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    pickerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeButton: {
        fontSize: 28,
        fontWeight: '400',
        color: '#9CA3AF',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    searchInput: {
        borderWidth: 0,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 24,
        marginTop: 16,
        marginBottom: 12,
    },
    countryList: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    countryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
        gap: 14,
        backgroundColor: '#FFFFFF',
    },
    countryFlag: {
        fontSize: 28,
        width: 36,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    countryCodeBadge: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '600',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleButtonActive: {
        backgroundColor: '#FFFFFF',
        ...GIFTYY_THEME.shadows.sm,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    toggleTextActive: {
        color: GIFTYY_THEME.colors.primary,
    },
    foundProfileMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    foundAvatarContainer: {
        position: 'relative',
    },
    foundAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    foundAvatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: GIFTYY_THEME.colors.primary,
    },
    badgeContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 2,
    },
    foundInfo: {
        flex: 1,
    },
    foundName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    foundType: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        marginTop: 2,
    },
    foundContact: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    connectButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    connectButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    notThemBtn: {
        marginTop: 16,
        alignSelf: 'center',
    },
    notThemText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    actionStack: {
        width: '100%',
        gap: 12,
    },
    inviteButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        marginBottom: 12,
    },
    inAppInviteButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 13,
        paddingHorizontal: 40,
        borderRadius: 50,
        alignSelf: 'center',
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    inAppInviteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    whatsappButton: {
        backgroundColor: '#25D366',
        shadowColor: '#25D366',
    },
    smsButton: {
        backgroundColor: '#374151',
        shadowColor: '#374151',
    },
    manualEntryBtn: {
        marginTop: 4,
        paddingVertical: 12,
        alignItems: 'center',
    },
    manualEntryText: {
        color: BRAND_COLOR,
        fontSize: 15,
        fontWeight: '700',
    },
    newContactCard: {
        borderColor: 'rgba(224, 123, 57, 0.2)',
        backgroundColor: '#FFF9F5',
    },
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    successIconBubble: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(224, 123, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    cardHeader: {
        alignSelf: 'stretch',
        alignItems: 'center',
        paddingBottom: 20,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(224, 123, 57, 0.1)',
    },
    cardHeaderEmoji: {
        fontSize: 32,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareOptionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
        width: '100%',
    },
    shareOptionItem: {
        alignItems: 'center',
        gap: 8,
    },
    shareIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    shareOptionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    mainActionButton: {
        backgroundColor: BRAND_COLOR,
        borderRadius: 16,
        paddingVertical: 18,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: BRAND_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    mainActionButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    backTextBottom: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    otpContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    otpInput: {
        width: '100%',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 10,
        color: GIFTYY_THEME.colors.primary,
        marginBottom: 12,
    },
    resendBtn: {
        padding: 8,
    },
    resendText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    methodToggleContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 4,
        gap: 8,
    },
    methodToggleLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    methodToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 3,
    },
    methodToggleBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    methodToggleBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    methodToggleBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    methodToggleBtnTextActive: {
        color: BRAND_COLOR,
    },
    methodToggleSub: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
});
