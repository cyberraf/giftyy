/**
 * Conversational Recipient Form Modal
 * Main modal component that integrates all steps
 */

import { CategoryIntroStep } from '@/components/forms/CategoryIntroStep';
import { ConversationalFormWizard } from '@/components/forms/ConversationalFormWizard';
import {
    Step0_Search,
    Step1_Name,
    Step2_Relationship,
    Step3_Address,
    Step3_ClaimProfile,
    Step3_Contact,
    Step4_Demographics,
    Step5a_Interests,
    Step5b_Interests,
} from '@/components/recipients/ConversationalFormSteps';
import {
    Step10_5_Sizes,
    Step10_GiftGuidance,
    Step11_LifeContext,
    Step12a_Personality,
    Step12b_Sensitivities,
    Step13_Summary,
    Step6_Style,
    Step7a_Entertainment,
    Step7b_Entertainment,
    Step8_Food,
    Step9_Lifestyle,
    StepMilestone_60,
} from '@/components/recipients/ConversationalFormSteps2';
import { useAuth } from '@/contexts/AuthContext';
import { calculatePreferenceCompletion, PREFERENCE_THRESHOLD } from '@/lib/utils/onboarding';
import type { Recipient } from '@/contexts/RecipientsContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { supabase } from '@/lib/supabase';
import { preferencesToDbRow } from '@/types/recipient-preferences';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConversationalRecipientFormProps = {
    visible: boolean;
    onClose: () => void;
    recipient?: Recipient;
    isSelf?: boolean;
    recipientProfileId?: string;
    matchedPhantom?: any;
    initialStepLabel?: string;
};

/**
 * Conversational Recipient Form Modal
 * A friendly, chat-like multi-step form for adding/editing recipients
 */
export function ConversationalRecipientForm({
    visible,
    onClose,
    recipient,
    isSelf,
    recipientProfileId,
    matchedPhantom,
    initialStepLabel,
}: ConversationalRecipientFormProps) {
    const { addRecipient, updateRecipient, refreshRecipients } = useRecipients();
    const { user } = useAuth();

    const handleComplete = async (formData: any) => {
        if (!user) return;
        console.log('[handleComplete] Starting submission');

        try {
            if (isSelf) {
                const dbRow = preferencesToDbRow(formData.preferences || {});
                let targetRpId = recipientProfileId;

                const profileUpdates = {
                    full_name: `${formData.firstName} ${formData.lastName || ''}`.trim() || 'Me',
                    // Save empty strings as null — unique constraint treats "" as a dupe but ignores null
                    phone: formData.phone?.trim() || null,
                    email: formData.email?.trim() || null,
                    address: formData.preferences?.address || null,
                    apartment: formData.preferences?.apartment || null,
                    city: formData.preferences?.city || null,
                    state: formData.preferences?.state || null,
                    country: formData.preferences?.country || null,
                    zip: formData.preferences?.zip || null,
                };

                console.log('[handleComplete] Self-profile updates:', profileUpdates);

                if (formData.claimMatched && formData.matchedPhantom) {
                    // LINK existing phantom to this user
                    targetRpId = formData.matchedPhantom.id;
                    console.log('[handleComplete] Claiming phantom:', targetRpId);

                    // Consolidation Logic: If claiming a phantom, delete any other profiles linked to this user
                    const { data: existingDuplicates } = await supabase
                        .from('recipient_profiles')
                        .select('id')
                        .eq('user_id', user.id)
                        .neq('id', targetRpId);

                    if (existingDuplicates && existingDuplicates.length > 0) {
                        console.log(`[CONSOLIDATION] Deleting ${existingDuplicates.length} duplicate profiles for user ${user.id}`);
                        await supabase
                            .from('recipient_profiles')
                            .delete()
                            .in('id', existingDuplicates.map(d => d.id));
                    }

                    const { error: linkError } = await supabase
                        .from('recipient_profiles')
                        .update({
                            ...profileUpdates,
                            user_id: user.id,
                            is_claimed: true,
                        })
                        .eq('id', targetRpId);

                    if (linkError) throw linkError;
                } else if (!targetRpId) {
                    // Before creating, check if a phantom already exists for this phone/email.
                    // Note: PostgREST treats '+' as a space in OR filter strings, so we search
                    // using the bare digits (no '+') as well as the full value.
                    const rawPhone: string = formData.phone || '';
                    const barePhone = rawPhone.replace(/^\+/, ''); // strip leading +
                    const orParts: string[] = [];
                    if (barePhone) {
                        orParts.push(`phone.eq.${rawPhone}`);
                        if (barePhone !== rawPhone) orParts.push(`phone.eq.${barePhone}`);
                    }
                    if (formData.email) orParts.push(`email.ilike.${formData.email}`);

                    let existingRpId: string | null = null;
                    if (orParts.length > 0) {
                        const { data: foundPhantom } = await supabase
                            .from('recipient_profiles')
                            .select('id')
                            .or(orParts.join(','))
                            .maybeSingle();
                        existingRpId = foundPhantom?.id ?? null;
                    }

                    if (existingRpId) {
                        // Claim the existing phantom profile instead of creating a duplicate
                        console.log('[handleComplete] Found existing phantom by phone/email, claiming:', existingRpId);
                        const { error: claimError } = await supabase
                            .from('recipient_profiles')
                            .update({ ...profileUpdates, user_id: user.id, is_claimed: true })
                            .eq('id', existingRpId);
                        if (claimError) throw claimError;
                        targetRpId = existingRpId;
                    } else {
                        // CREATE new profile for self
                        console.log('[handleComplete] Creating new self-profile');
                        const { data: newRp, error: createError } = await supabase
                            .from('recipient_profiles')
                            .insert({ ...profileUpdates, user_id: user.id, is_claimed: true })
                            .select()
                            .single();

                        if (createError) {
                            if (createError.code === '23505') {
                                // Race condition / phone mismatch — find by user_id as last resort
                                const { data: myRp } = await supabase
                                    .from('recipient_profiles')
                                    .select('id')
                                    .eq('user_id', user.id)
                                    .maybeSingle();
                                if (myRp) {
                                    console.log('[handleComplete] Recovered from 23505 — using existing profile:', myRp.id);
                                    targetRpId = myRp.id;
                                } else {
                                    throw createError;
                                }
                            } else {
                                throw createError;
                            }
                        } else {
                            targetRpId = newRp.id;
                        }
                    }
                } else {
                    console.log('[handleComplete] Updating self-profile:', targetRpId, profileUpdates);
                    const { error: updateError } = await supabase
                        .from('recipient_profiles')
                        .update(profileUpdates)
                        .eq('id', targetRpId);

                    if (updateError) {
                        console.error('[handleComplete] Error updating profile:', updateError);
                        throw updateError;
                    }
                    console.log('[handleComplete] Profile update successful');
                }

                // Upsert preferences
                if (targetRpId) {
                    console.log('[handleComplete] Upserting preferences for self. targetRpId:', targetRpId);
                    console.log('[handleComplete] dbRow:', dbRow);

                    // Try with recipient_profile_id first
                    const { data: upsertData, error: prefError } = await supabase
                        .from('recipient_preferences')
                        .upsert({
                            ...dbRow,
                            recipient_profile_id: targetRpId,
                            recipient_id: targetRpId, // Try to populate both
                        }, { onConflict: 'recipient_profile_id' })
                        .select();

                    if (prefError) {
                        console.warn('[handleComplete] Upsert failed with onConflict:recipient_profile_id. Error:', prefError);
                        console.warn('[handleComplete] Retrying with onConflict:recipient_id...');

                        const { data: upsertData2, error: prefError2 } = await supabase
                            .from('recipient_preferences')
                            .upsert({
                                ...dbRow,
                                recipient_id: targetRpId,
                                recipient_profile_id: targetRpId,
                            }, { onConflict: 'recipient_id' })
                            .select();

                        if (prefError2) {
                            console.error('[handleComplete] Second upsert attempt also failed:', prefError2);
                            throw prefError2;
                        }
                        console.log('[handleComplete] Upsert (retry) success:', upsertData2);
                    } else {
                        console.log('[handleComplete] Upsert (primary) success:', upsertData);
                    }
                }


                await refreshRecipients();
            } else if (recipient) {
                // Update existing recipient connection
                const connUpdates = {
                    nickname: formData.firstName || recipient.firstName,
                    relationship: formData.relationship || recipient.relationship,
                };
                console.log('[handleComplete] Updating friend connection:', recipient.id, connUpdates);
                const { error: connError } = await updateRecipient(recipient.id, connUpdates);
                if (connError) throw connError;

                if (recipient.profileId) {
                    console.log('[handleComplete] Updating friend profile:', recipient.profileId);
                    const profileUpdates = {
                        full_name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || undefined,
                        phone: formData.phone || undefined,
                        email: formData.email || undefined,
                        address: formData.preferences?.address || null,
                        apartment: formData.preferences?.apartment || null,
                        city: formData.preferences?.city || null,
                        state: formData.preferences?.state || null,
                        country: formData.preferences?.country || null,
                        zip: formData.preferences?.zip || null,
                    };

                    const { error: profileError } = await supabase
                        .from('recipient_profiles')
                        .update(profileUpdates)
                        .eq('id', recipient.profileId);

                    if (profileError) {
                        console.warn('[handleComplete] Failed to update friend profile address:', profileError);
                    }

                    // Also upsert preferences
                    const dbRow = preferencesToDbRow(formData.preferences || {});
                    console.log('[handleComplete] Upserting preferences for recipient. profileId:', recipient.profileId);

                    const { data: upsertData, error: prefError } = await supabase
                        .from('recipient_preferences')
                        .upsert({
                            ...dbRow,
                            recipient_profile_id: recipient.profileId,
                            recipient_id: recipient.profileId,
                        }, { onConflict: 'recipient_profile_id' })
                        .select();

                    if (prefError) {
                        console.warn('[handleComplete] Upsert failed (recipient_profile_id). Error:', prefError);
                        console.warn('[handleComplete] Retrying with onConflict:recipient_id...');
                        const { data: upsertData2, error: prefError2 } = await supabase
                            .from('recipient_preferences')
                            .upsert({
                                ...dbRow,
                                recipient_id: recipient.profileId,
                                recipient_profile_id: recipient.profileId,
                            }, { onConflict: 'recipient_id' })
                            .select();
                        if (prefError2) {
                            console.error('[handleComplete] Second upsert attempt for recipient failed:', prefError2);
                        } else {
                            console.log('[handleComplete] Upsert (retry) for recipient success:', upsertData2);
                        }
                    } else {
                        console.log('[handleComplete] Upsert (primary) for recipient success:', upsertData);
                    }
                }
            } else {
                // Add new recipient via Edge Function
                console.log('[handleComplete] Adding new recipient');
                await addRecipient({
                    fullName: `${formData.firstName} ${formData.lastName || ''}`.trim(),
                    phone: formData.phone,
                    email: formData.email,
                    relationship: formData.relationship,
                    nickname: formData.firstName,
                    address: formData.preferences?.address,
                    apartment: formData.preferences?.apartment,
                    city: formData.preferences?.city,
                    state: formData.preferences?.state,
                    country: formData.preferences?.country,
                    zip: formData.preferences?.zip,
                    preferences: formData.preferences
                });
            }
            onClose();
        } catch (error) {
            console.error('[handleComplete] Error saving recipient:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isSelf ? 'My Gifting Preferences' : recipient ? 'Edit Recipient' : 'Add Recipient'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                {(() => {
                    const formSteps = [
                        !recipient && !isSelf && <Step0_Search key="search" label="Find Recipient" />,
                        <Step1_Name
                            key="name"
                            label="Name"
                            shouldShow={(data: any) => !!(!data.existingProfile && !isSelf) || !!isSelf}
                            isSelf={isSelf}
                        />,
                        <Step2_Relationship
                            key="relationship"
                            label="Relationship"
                            shouldShow={() => !isSelf}
                        />,
                        <Step3_Contact
                            key="contact"
                            label="Contact Info"
                            shouldShow={(data: any) => !data.existingProfile && !isSelf}
                            isSelf={isSelf}
                        />,
                        <Step3_Address key="address" label="Mailing Address" isSelf={isSelf} />,
                        <Step3_ClaimProfile
                            key="claim"
                            label="Claim Profile"
                            shouldShow={(data: any) => !!(isSelf && data.matchedPhantom)}
                        />,

                        // --- Preference categories with Giftyy intro screens (isSelf only) ---

                        isSelf && <CategoryIntroStep
                            key="intro-basics"
                            label="Intro: Basics"
                            categoryKey="basics"
                            categoryEmoji="✨"
                            title="The Basics"
                            message="Quick questions about you — age, gender, pronouns."
                            shouldShow={() => !!isSelf}
                        />,
                        <Step4_Demographics key="basics" label="Basics" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-interests"
                            label="Intro: Interests"
                            categoryKey="interests"
                            categoryEmoji="🎯"
                            title="Your Interests"
                            message="Sports, hobbies, tech, creative stuff — what excites you?"
                            shouldShow={() => !!isSelf}
                        />,
                        <Step5a_Interests key="interests-a" label="Activities" isSelf={isSelf} />,
                        <Step5b_Interests key="interests-b" label="Hobbies & Tech" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-style"
                            label="Intro: Style"
                            categoryKey="style"
                            categoryEmoji="🎨"
                            title="Style & Aesthetics"
                            message="Fashion, colors, home décor — what's your vibe?"
                            shouldShow={() => !!isSelf}
                        />,
                        <Step6_Style key="style" label="Style" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-entertainment"
                            label="Intro: Entertainment"
                            categoryKey="entertainment"
                            categoryEmoji="🎬"
                            title="Entertainment"
                            message="Music, movies, shows, books — what are you into?"
                            shouldShow={() => !!isSelf}
                        />,
                        <Step7a_Entertainment key="ent-a" label="Music & Shows" isSelf={isSelf} />,
                        <Step7b_Entertainment key="ent-b" label="Books & Podcasts" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-food"
                            label="Intro: Food & Drink"
                            categoryKey="food"
                            categoryEmoji="🍽️"
                            title="Food & Drink"
                            message="Dietary preferences, cuisines, and drink choices."
                            shouldShow={() => !!isSelf}
                        />,
                        <Step8_Food key="food" label="Food & Drink" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-lifestyle"
                            label="Intro: Lifestyle"
                            categoryKey="lifestyle"
                            categoryEmoji="🌿"
                            title="Lifestyle & Values"
                            message="Your values, wellness, and daily routine."
                            shouldShow={() => !!isSelf}
                        />,
                        <Step9_Lifestyle key="lifestyle" label="Lifestyle" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-gifts"
                            label="Intro: Gift Preferences"
                            categoryKey="gifts"
                            categoryEmoji="🎁"
                            title="Gift Preferences"
                            message="What gifts make you go 'wow'?"
                            shouldShow={() => !!isSelf}
                        />,
                        <Step10_GiftGuidance key="guidance" label="Gift Guidance" isSelf={isSelf} />,

                        isSelf && <StepMilestone_60
                            key="milestone60"
                            label="Milestone"
                            isSelf={isSelf}
                            shouldShow={(data: any) => {
                                if (data._milestoneShown) return false;
                                const prefs = data.preferences || {};
                                return calculatePreferenceCompletion(prefs).percentage >= PREFERENCE_THRESHOLD;
                            }}
                        />,

                        isSelf && <CategoryIntroStep
                            key="intro-sizes"
                            label="Intro: Sizes"
                            categoryKey="sizes"
                            categoryEmoji="📏"
                            title="Your Sizes"
                            message="Optional but helpful for clothing and accessories."
                            shouldShow={() => !!isSelf}
                        />,
                        <Step10_5_Sizes key="sizes" label="Sizes" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-life"
                            label="Intro: Life Chapter"
                            categoryKey="life"
                            categoryEmoji="🌱"
                            title="Life Chapter"
                            message="Milestones, transitions, and where you are right now."
                            shouldShow={() => !!isSelf}
                        />,
                        <Step11_LifeContext key="life" label="Life Context" isSelf={isSelf} />,

                        isSelf && <CategoryIntroStep
                            key="intro-personality"
                            label="Intro: Personality"
                            categoryKey="personality"
                            categoryEmoji="💫"
                            title="Your Personality"
                            message="How would your friends describe you?"
                            shouldShow={() => !!isSelf}
                        />,
                        <Step12a_Personality key="personality-a" label="Personality" isSelf={isSelf} />,
                        <Step12b_Sensitivities key="personality-b" label="Sensitivities" isSelf={isSelf} />,

                        <Step13_Summary key="summary" label="Summary" isSelf={isSelf} />,
                    ].filter(Boolean) as React.ReactElement<any>[];

                    return (
                        <ConversationalFormWizard
                            initialData={{ ...recipient, isSelf, matchedPhantom }}
                            onComplete={handleComplete}
                            onCancel={onClose}
                            onSaveAndExit={handleComplete}
                            initialStep={(() => {
                                if (!initialStepLabel) return 0;
                                const idx = formSteps.findIndex(child => child.props.label === initialStepLabel);
                                return idx >= 0 ? idx : 0;
                            })()}
                            completionCalculator={(data) => calculatePreferenceCompletion(data?.preferences)}
                        >
                            {formSteps}
                        </ConversationalFormWizard>
                    );
                })()}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.1)',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(47,35,24,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: 'rgba(47,35,24,0.6)',
        fontWeight: '400',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2F2318',
    },
    headerSpacer: {
        width: 36,
    },
});
