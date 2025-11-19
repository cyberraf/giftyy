import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const palette = {
    background: '#F5F4F2',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
};

type ProfileData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    bio: string;
    profileImage: string | null;
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    language: string;
    timezone: string;
};

const INITIAL_PROFILE: ProfileData = {
    firstName: 'Taylor',
    lastName: 'Johnson',
    email: 'taylor.johnson@example.com',
    phone: '(555) 123-4567',
    dateOfBirth: '1990-05-15',
    bio: 'Love gifting meaningful moments to friends and family.',
    profileImage: null,
    notifications: {
        email: true,
        push: true,
        sms: false,
    },
    language: 'English',
    timezone: 'America/New_York',
};

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean'];
const TIMEZONES = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
];

export default function ProfilePreferencesScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { profile: authProfile, user, updateProfile: updateAuthProfile, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load profile from auth context when available
    useEffect(() => {
        if (authProfile) {
            setProfile({
                firstName: authProfile.first_name || '',
                lastName: authProfile.last_name || '',
                email: user?.email || '',
                phone: authProfile.phone || '',
                dateOfBirth: authProfile.date_of_birth || '',
                bio: authProfile.bio || '',
                profileImage: authProfile.profile_image_url || null,
                notifications: {
                    email: true,
                    push: true,
                    sms: false,
                },
                language: 'English',
                timezone: 'America/New_York',
            });
        }
    }, [authProfile, user]);

    const updateProfile = (updates: Partial<ProfileData>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const updateNotifications = (key: keyof ProfileData['notifications'], value: boolean) => {
        setProfile((prev) => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value },
        }));
        setHasChanges(true);
    };

    const [uploadingImage, setUploadingImage] = useState(false);

    const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
        try {
            // Convert image to base64
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            
            // Get file extension
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `profile_images/${user?.id}/${fileName}`;

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from('profile_images')
                .upload(filePath, arrayBuffer, {
                    contentType: blob.type,
                    upsert: false,
                });

            if (error) {
                console.error('Error uploading image:', error);
                Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
                return null;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('profile_images')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err: any) {
            console.error('Error uploading image:', err);
            Alert.alert('Upload Error', `Failed to upload image: ${err.message}`);
            return null;
        }
    };

    const deleteImageFromSupabase = async (imageUrl: string): Promise<void> => {
        try {
            // Extract file path from URL
            const urlParts = imageUrl.split('/profile_images/');
            if (urlParts.length < 2) {
                console.warn('Could not extract file path from URL:', imageUrl);
                return;
            }
            const filePath = `profile_images/${urlParts[1]}`;

            // Delete from Supabase storage
            const { error } = await supabase.storage
                .from('profile_images')
                .remove([filePath]);

            if (error) {
                console.error('Error deleting image:', error);
                // Don't show alert for delete errors, just log
            }
        } catch (err: any) {
            console.error('Error deleting image:', err);
            // Don't show alert for delete errors, just log
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: false,
        });

        if (!result.canceled && result.assets[0]) {
            setUploadingImage(true);
            const uploadedUrl = await uploadImageToSupabase(result.assets[0].uri);
            setUploadingImage(false);

            if (uploadedUrl) {
                // Delete old image if it exists
                if (profile.profileImage && profile.profileImage.startsWith('http')) {
                    await deleteImageFromSupabase(profile.profileImage);
                }
                updateProfile({ profileImage: uploadedUrl });
            }
        }
    };

    const handleDeleteImage = async () => {
        if (!profile.profileImage) return;

        Alert.alert(
            'Delete Profile Picture',
            'Are you sure you want to delete your profile picture?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        // Delete from storage if it's a Supabase URL
                        if (profile.profileImage.startsWith('http')) {
                            await deleteImageFromSupabase(profile.profileImage);
                        }
                        updateProfile({ profileImage: null });
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        // Validate required fields
        if (!profile.firstName.trim()) {
            Alert.alert('Validation error', 'First name is required.');
            return;
        }

        setSaving(true);
        const { error } = await updateAuthProfile({
            first_name: profile.firstName.trim(),
            last_name: profile.lastName.trim(),
            phone: profile.phone || null,
            date_of_birth: profile.dateOfBirth || null,
            bio: profile.bio || null,
            profile_image_url: profile.profileImage || null,
        });

        setSaving(false);

        if (error) {
            Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
        } else {
            Alert.alert('Success', 'Your profile has been updated.');
            setHasChanges(false);
        }
    };

    const getInitials = () => {
        const first = profile.firstName.charAt(0).toUpperCase();
        const last = profile.lastName.charAt(0).toUpperCase();
        return `${first}${last}`;
    };

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={top}
        >
            <View style={[styles.screen, { paddingTop: top + 8 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="chevron.left" size={24} color={palette.textPrimary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Profile & Preferences</Text>
                    <Pressable
                        onPress={handleSave}
                        disabled={!hasChanges || saving || authLoading}
                        style={[styles.saveButton, (!hasChanges || saving || authLoading) && styles.saveButtonDisabled]}
                    >
                        {saving ? (
                            <Text style={[styles.saveButtonText, styles.saveButtonTextDisabled]}>Saving...</Text>
                        ) : (
                            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>Save</Text>
                        )}
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Profile Picture Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile picture</Text>
                        <View style={styles.profilePictureCard}>
                            <View style={styles.avatarContainer}>
                                <Pressable onPress={handlePickImage} disabled={uploadingImage} style={styles.avatarPressable}>
                                    {uploadingImage ? (
                                        <View style={styles.avatarBubble}>
                                            <ActivityIndicator size="large" color={BRAND_COLOR} />
                                        </View>
                                    ) : profile.profileImage ? (
                                        <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={styles.avatarBubble}>
                                            <Text style={styles.avatarInitials}>{getInitials()}</Text>
                                        </View>
                                    )}
                                    {!uploadingImage && (
                                        <View style={styles.editAvatarBadge}>
                                            <IconSymbol name="square.and.pencil" size={16} color="#FFFFFF" />
                                        </View>
                                    )}
                                </Pressable>
                                {profile.profileImage && !uploadingImage && (
                                    <Pressable onPress={handleDeleteImage} style={styles.deleteImageButton}>
                                        <IconSymbol name="trash.fill" size={18} color={palette.danger} />
                                    </Pressable>
                                )}
                            </View>
                            <Text style={styles.avatarHint}>
                                {uploadingImage ? 'Uploading...' : 'Tap to change profile picture'}
                            </Text>
                        </View>
                    </View>

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal information</Text>
                        <View style={styles.formCard}>
                            <View style={styles.formRow}>
                                <View style={[styles.inputGroup, styles.formColumn]}>
                                    <Text style={styles.inputLabel}>First name</Text>
                                    <TextInput
                                        value={profile.firstName}
                                        onChangeText={(text) => updateProfile({ firstName: text })}
                                        style={styles.textInput}
                                        placeholder="First name"
                                        placeholderTextColor={palette.textSecondary}
                                        autoCapitalize="words"
                                    />
                                </View>
                                <View style={[styles.inputGroup, styles.formColumn]}>
                                    <Text style={styles.inputLabel}>Last name</Text>
                                    <TextInput
                                        value={profile.lastName}
                                        onChangeText={(text) => updateProfile({ lastName: text })}
                                        style={styles.textInput}
                                        placeholder="Last name"
                                        placeholderTextColor={palette.textSecondary}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    value={profile.email}
                                    editable={false}
                                    style={[styles.textInput, { backgroundColor: palette.neutralSoft, color: palette.textSecondary }]}
                                    placeholder="email@example.com"
                                    placeholderTextColor={palette.textSecondary}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoCorrect={false}
                                />
                                <Text style={{ fontSize: 12, color: palette.textSecondary, marginTop: 4 }}>
                                    Email cannot be changed here. Contact support to update your email.
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone number</Text>
                                <TextInput
                                    value={profile.phone}
                                    onChangeText={(text) => updateProfile({ phone: text })}
                                    style={styles.textInput}
                                    placeholder="(555) 123-4567"
                                    placeholderTextColor={palette.textSecondary}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Date of birth</Text>
                                <TextInput
                                    value={profile.dateOfBirth}
                                    onChangeText={(text) => updateProfile({ dateOfBirth: text })}
                                    style={styles.textInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={palette.textSecondary}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Bio</Text>
                                <TextInput
                                    value={profile.bio}
                                    onChangeText={(text) => updateProfile({ bio: text })}
                                    style={[styles.textInput, styles.textInputMultiline]}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={palette.textSecondary}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>
                        <View style={styles.formCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Language</Text>
                                <View style={styles.pickerContainer}>
                                    <Text style={styles.pickerValue}>{profile.language}</Text>
                                    <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Timezone</Text>
                                <View style={styles.pickerContainer}>
                                    <Text style={styles.pickerValue}>{profile.timezone.replace('_', ' ')}</Text>
                                    <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Notification Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notifications</Text>
                        <View style={styles.formCard}>
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>Email notifications</Text>
                                    <Text style={styles.switchDescription}>Receive updates via email</Text>
                                </View>
                                <Pressable
                                    onPress={() => updateNotifications('email', !profile.notifications.email)}
                                    style={[styles.switch, profile.notifications.email && styles.switchActive]}
                                >
                                    <View style={[styles.switchThumb, profile.notifications.email && styles.switchThumbActive]} />
                                </Pressable>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>Push notifications</Text>
                                    <Text style={styles.switchDescription}>Receive push notifications on your device</Text>
                                </View>
                                <Pressable
                                    onPress={() => updateNotifications('push', !profile.notifications.push)}
                                    style={[styles.switch, profile.notifications.push && styles.switchActive]}
                                >
                                    <View style={[styles.switchThumb, profile.notifications.push && styles.switchThumbActive]} />
                                </Pressable>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>SMS notifications</Text>
                                    <Text style={styles.switchDescription}>Receive updates via text message</Text>
                                </View>
                                <Pressable
                                    onPress={() => updateNotifications('sms', !profile.notifications.sms)}
                                    style={[styles.switch, profile.notifications.sms && styles.switchActive]}
                                >
                                    <View style={[styles.switchThumb, profile.notifications.sms && styles.switchThumbActive]} />
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.section}>
                        <View style={styles.dangerCard}>
                            <Text style={styles.dangerTitle}>Account actions</Text>
                            <Pressable style={styles.dangerButton}>
                                <Text style={styles.dangerButtonText}>Change password</Text>
                                <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                            </Pressable>
                            <Pressable style={styles.dangerButton}>
                                <Text style={styles.dangerButtonText}>Delete account</Text>
                                <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    saveButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    saveButtonDisabled: {
        backgroundColor: palette.neutralSoft,
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    saveButtonTextDisabled: {
        color: palette.textSecondary,
    },
    content: {
        padding: 20,
        gap: 24,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    profilePictureCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPressable: {
        position: 'relative',
    },
    deleteImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: palette.danger,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    avatarBubble: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: palette.border,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: palette.border,
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: palette.card,
    },
    avatarHint: {
        fontSize: 14,
        color: palette.textSecondary,
    },
    formCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 20,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formColumn: {
        flex: 1,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    textInput: {
        backgroundColor: palette.cardAlt,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: palette.textPrimary,
        borderWidth: 1,
        borderColor: palette.border,
    },
    textInputMultiline: {
        minHeight: 100,
        paddingTop: 14,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: palette.cardAlt,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: palette.border,
    },
    pickerValue: {
        fontSize: 16,
        color: palette.textPrimary,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    switchLabelContainer: {
        flex: 1,
        gap: 4,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    switchDescription: {
        fontSize: 14,
        color: palette.textSecondary,
    },
    switch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.neutralSoft,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    switchActive: {
        backgroundColor: BRAND_COLOR,
    },
    switchThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    switchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    dangerCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 12,
    },
    dangerTitle: {
        fontSize: 18,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 4,
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    dangerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: palette.danger,
    },
});

