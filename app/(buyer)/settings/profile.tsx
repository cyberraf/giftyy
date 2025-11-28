import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { checkSupabaseConnection } from '@/utils/supabase-diagnostics';

// Generate a unique ID using expo-crypto (compatible with React Native)
const generateUniqueId = async (): Promise<string> => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${Date.now()}-${Math.random()}`);
};

const palette = {
    background: '#fff',
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
};

const INITIAL_PROFILE: ProfileData = {
    firstName: 'Taylor',
    lastName: 'Johnson',
    email: 'taylor.johnson@example.com',
    phone: '(555) 123-4567',
    dateOfBirth: '1990-05-15',
    bio: 'Love gifting meaningful moments to friends and family.',
    profileImage: null,
};


// Format phone number as +1 (XXX) XXX-XXXX (with country code)
const formatPhoneNumber = (text: string): string => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 11 digits total (1 country code + 10 digit number)
    const limited = cleaned.slice(0, 11);
    
    // If empty, return empty string
    if (limited.length === 0) return '';
    
    // Always start with + for country code
    // Format: +1 (XXX) XXX-XXXX
    if (limited.length === 1) return `+${limited}`;
    if (limited.length <= 4) return `+${limited.slice(0, 1)} (${limited.slice(1)}`;
    if (limited.length <= 7) return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
    return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 11)}`;
};

// Format date of birth as MM/DD/YYYY
const formatDateOfBirth = (text: string): string => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = cleaned.slice(0, 8);
    
    // Apply formatting
    if (limited.length === 0) return '';
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
};

// Convert formatted date (MM/DD/YYYY) to database format (YYYY-MM-DD)
const formatDateForDatabase = (formattedDate: string): string | null => {
    if (!formattedDate) return null;
    // Remove all non-digit characters
    const cleaned = formattedDate.replace(/\D/g, '');
    if (cleaned.length !== 8) return null; // Return null if not complete (need 8 digits)
    
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    
    // Basic validation: month should be 01-12, day should be 01-31
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return null; // Invalid date
    }
    
    return `${year}-${month}-${day}`;
};

// Convert database date (YYYY-MM-DD) to display format (MM/DD/YYYY)
const formatDateFromDatabase = (dbDate: string | null): string => {
    if (!dbDate) return '';
    // Check if already in YYYY-MM-DD format
    const match = dbDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[2]}/${match[3]}/${match[1]}`;
    }
    return dbDate;
};

export default function ProfilePreferencesScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { profile: authProfile, user, updateProfile: updateAuthProfile, loading: authLoading, deleteAccount, resetPasswordForEmail } = useAuth();
    const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [changePwdModalVisible, setChangePwdModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    // Utility to prevent indefinite waiting on poor networks
    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
        ]) as T;
    };

    // Load profile from auth context when available
    useEffect(() => {
        if (authProfile) {
            setProfile({
                firstName: authProfile.first_name || '',
                lastName: authProfile.last_name || '',
                email: user?.email || '',
                phone: authProfile.phone 
                    ? (authProfile.phone.startsWith('+') 
                        ? formatPhoneNumber(authProfile.phone) 
                        : formatPhoneNumber(`+${authProfile.phone}`))
                    : '',
                dateOfBirth: authProfile.date_of_birth ? formatDateFromDatabase(authProfile.date_of_birth) : '',
                bio: authProfile.bio || '',
                profileImage: authProfile.profile_image_url || null,
            });
        }
    }, [authProfile, user]);

    const updateProfile = (updates: Partial<ProfileData>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
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
            const uniqueId = await generateUniqueId();
            // Take first 16 chars for shorter filename (still unique enough)
            const fileName = `${uniqueId.substring(0, 16)}.${fileExt}`;
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
        
        // Convert formatted phone to digits only for storage (including country code)
        const phoneDigits = profile.phone.replace(/\D/g, '');
        const phoneForDb = phoneDigits.length === 11 ? phoneDigits : null;
        
        // Convert formatted date (MM/DD/YYYY) to database format (YYYY-MM-DD)
        const dateForDb = profile.dateOfBirth ? formatDateForDatabase(profile.dateOfBirth) : null;
        
        const { error } = await updateAuthProfile({
            first_name: profile.firstName.trim(),
            last_name: profile.lastName.trim(),
            phone: phoneForDb,
            date_of_birth: dateForDb,
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
                                    onChangeText={(text) => {
                                        const formatted = formatPhoneNumber(text);
                                        updateProfile({ phone: formatted });
                                    }}
                                    style={styles.textInput}
                                    placeholder="+1 (555) 123-4567"
                                    placeholderTextColor={palette.textSecondary}
                                    keyboardType="phone-pad"
                                    maxLength={18} // +1 (XXX) XXX-XXXX = 18 characters
                                />
                                {profile.phone && profile.phone.replace(/\D/g, '').length !== 11 && (
                                    <Text style={styles.inputHint}>Please enter a valid phone number with country code (e.g., +1 (555) 123-4567)</Text>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Date of birth</Text>
                                <TextInput
                                    value={profile.dateOfBirth}
                                    onChangeText={(text) => {
                                        const formatted = formatDateOfBirth(text);
                                        updateProfile({ dateOfBirth: formatted });
                                    }}
                                    style={styles.textInput}
                                    placeholder="MM/DD/YYYY"
                                    placeholderTextColor={palette.textSecondary}
                                    keyboardType="numeric"
                                    maxLength={10} // MM/DD/YYYY = 10 characters
                                />
                                {profile.dateOfBirth && profile.dateOfBirth.replace(/\D/g, '').length !== 8 && (
                                    <Text style={styles.inputHint}>Please enter a valid date (MM/DD/YYYY)</Text>
                                )}
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

                    {/* Account Actions */}
                    <View style={styles.section}>
                        <View style={styles.dangerCard}>
                            <Text style={styles.dangerTitle}>Account actions</Text>
                            <Pressable 
                                style={styles.dangerButton}
                                onPress={() => {
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setChangePwdModalVisible(true);
                                }}
                            >
                                <Text style={styles.dangerButtonText}>Change password</Text>
                                <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                            </Pressable>
                            <Pressable 
                                style={styles.dangerButton}
                                onPress={() => setDeleteModalVisible(true)}
                            >
                                <Text style={styles.dangerButtonText}>Delete account</Text>
                                <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Delete Account Password Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (!deleting) {
                        setDeleteModalVisible(false);
                        setDeletePassword('');
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delete Account</Text>
                        <Text style={styles.modalDescription}>
                            This action cannot be undone. To confirm, please enter your password.
                        </Text>
                        
                        <View style={styles.modalInputWrapper}>
                            <TextInput
                                value={deletePassword}
                                onChangeText={setDeletePassword}
                                placeholder="Enter your password"
                                placeholderTextColor={palette.textSecondary}
                                style={styles.modalInput}
                                secureTextEntry={!showDeletePassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!deleting}
                            />
                            <Pressable
                                onPress={() => setShowDeletePassword((v) => !v)}
                                style={styles.modalIconToggle}
                                disabled={deleting}
                                accessibilityRole="button"
                                accessibilityLabel={showDeletePassword ? 'Hide password' : 'Show password'}
                            >
                                <IconSymbol name={showDeletePassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={palette.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    if (!deleting) {
                                        setDeleteModalVisible(false);
                                        setDeletePassword('');
                                    }
                                }}
                                disabled={deleting}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </Pressable>
                            
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonDelete, deleting && styles.modalButtonDisabled]}
                                onPress={async () => {
                                    if (!deletePassword.trim()) {
                                        Alert.alert('Error', 'Please enter your password');
                                        return;
                                    }

                                    setDeleting(true);
                                    const { error } = await deleteAccount(deletePassword);
                                    setDeleting(false);

                                    if (error) {
                                        Alert.alert(
                                            'Error',
                                            error.message || 'Failed to delete account. Please check your password and try again.'
                                        );
                                    } else {
                                        // Account deletion successful, user will be signed out automatically
                                        Alert.alert(
                                            'Account Deleted',
                                            'Your account has been deleted successfully.'
                                        );
                                    }
                                }}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonDeleteText}>Delete Account</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={changePwdModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    if (!changingPassword) {
                        setChangePwdModalVisible(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <Text style={styles.modalDescription}>
                            Create a strong password to keep your account secure. Your current password is optional.
                        </Text>

                        <View style={styles.modalInputWrapper}>
                            <TextInput
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Current password (optional)"
                                placeholderTextColor={palette.textSecondary}
                                style={styles.modalInput}
                                secureTextEntry={!showCurrentPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!changingPassword}
                            />
                            <Pressable
                                onPress={() => setShowCurrentPassword((v) => !v)}
                                style={styles.modalIconToggle}
                                disabled={changingPassword}
                                accessibilityRole="button"
                                accessibilityLabel={showCurrentPassword ? 'Hide password' : 'Show password'}
                            >
                                <IconSymbol name={showCurrentPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={palette.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.modalInputWrapper}>
                            <TextInput
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="New password (min 8 characters)"
                                placeholderTextColor={palette.textSecondary}
                                style={styles.modalInput}
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!changingPassword}
                            />
                            <Pressable
                                onPress={() => setShowNewPassword((v) => !v)}
                                style={styles.modalIconToggle}
                                disabled={changingPassword}
                                accessibilityRole="button"
                                accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                                <IconSymbol name={showNewPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={palette.textSecondary} />
                            </Pressable>
                        </View>

                        {newPassword.length > 0 && (
                            <View style={{ marginBottom: 10 }}>
                                {(() => {
                                    const lengthOK = newPassword.length >= 8;
                                    const lowerOK = /[a-z]/.test(newPassword);
                                    const upperOK = /[A-Z]/.test(newPassword);
                                    const digitOK = /\d/.test(newPassword);
                                    const specialOK = /[^A-Za-z0-9]/.test(newPassword);
                                    const score = [lengthOK, lowerOK, upperOK, digitOK, specialOK].filter(Boolean).length;
                                    const strengthLabel = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.max(0, score - 1)];
                                    const strengthColor = score >= 4 ? palette.success : score === 3 ? '#EAB308' : palette.danger;
                                    return (
                                        <View>
                                            <View style={styles.strengthBars}>
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.strengthBar,
                                                            i < score && { backgroundColor: strengthColor, borderColor: strengthColor },
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                            <Text style={[styles.helperText, { color: strengthColor }]}>
                                                {strengthLabel}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        )}

                        <View style={styles.modalInputWrapper}>
                            <TextInput
                                value={confirmNewPassword}
                                onChangeText={setConfirmNewPassword}
                                placeholder="Confirm new password"
                                placeholderTextColor={palette.textSecondary}
                                style={styles.modalInput}
                                secureTextEntry={!showConfirmNewPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!changingPassword}
                            />
                            <Pressable
                                onPress={() => setShowConfirmNewPassword((v) => !v)}
                                style={styles.modalIconToggle}
                                disabled={changingPassword}
                                accessibilityRole="button"
                                accessibilityLabel={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                            >
                                <IconSymbol name={showConfirmNewPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} color={palette.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={{ gap: 6, marginTop: -6, marginBottom: 12 }}>
                            {(() => {
                                const lengthOK = newPassword.length >= 8;
                                const lowerOK = /[a-z]/.test(newPassword);
                                const upperOK = /[A-Z]/.test(newPassword);
                                const digitOK = /\d/.test(newPassword);
                                const specialOK = /[^A-Za-z0-9]/.test(newPassword);
                                const Row = ({ ok, text }: { ok: boolean; text: string }) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <IconSymbol name={ok ? 'checkmark.circle.fill' : 'circle'} size={16} color={ok ? palette.success : palette.textSecondary} />
                                        <Text style={[styles.helperText, { color: ok ? palette.textPrimary : palette.textSecondary }]}>{text}</Text>
                                    </View>
                                );
                                return (
                                    <View>
                                        <Row ok={lengthOK} text="At least 8 characters" />
                                        <Row ok={lowerOK} text="Lowercase letter" />
                                        <Row ok={upperOK} text="Uppercase letter" />
                                        <Row ok={digitOK} text="Number" />
                                        <Row ok={specialOK} text="Special character" />
                                    </View>
                                );
                            })()}
                        </View>

                        <Pressable
                            onPress={() => {
                                setChangePwdModalVisible(false);
                                router.push('/(auth)/forgot-password');
                            }}
                            accessibilityRole="button"
                            style={styles.linkButton}
                        >
                            <Text style={styles.linkText}>Forgot your current password?</Text>
                        </Pressable>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    if (!changingPassword) {
                                        setChangePwdModalVisible(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                    }
                                }}
                                disabled={changingPassword}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.modalButton, styles.saveButton, changingPassword && styles.modalButtonDisabled]}
                                onPress={async () => {
                                    if (!user?.email) {
                                        Alert.alert('Error', 'No authenticated user found.');
                                        return;
                                    }

                                    if (!newPassword.trim() || !confirmNewPassword.trim()) {
                                        Alert.alert('Error', 'Please fill out the new password fields');
                                        return;
                                    }

                                    const lengthOK = newPassword.length >= 8;
                                    const lowerOK = /[a-z]/.test(newPassword);
                                    const upperOK = /[A-Z]/.test(newPassword);
                                    const digitOK = /\d/.test(newPassword);
                                    const specialOK = /[^A-Za-z0-9]/.test(newPassword);
                                    if (!lengthOK || !lowerOK || !upperOK || !digitOK || !specialOK) {
                                        Alert.alert('Error', 'Please meet all password requirements');
                                        return;
                                    }

                                    if (newPassword !== confirmNewPassword) {
                                        Alert.alert('Error', 'New passwords do not match');
                                        return;
                                    }

                                    // Quick connectivity check to provide clearer error messages
                                    try {
                                        const diag = await withTimeout(checkSupabaseConnection(), 5000);
                                        if (!diag.configured) {
                                            Alert.alert('Configuration error', 'Supabase environment variables are missing. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
                                            return;
                                        }
                                        if (!diag.reachable) {
                                            Alert.alert('Network error', diag.error || 'Cannot reach Supabase. Please check your internet connection.');
                                            return;
                                        }
                                    } catch {
                                        // If the diagnostics itself times out, proceed but keep longer timeout on the update call
                                    }

                                    setChangingPassword(true);
                                    try {
                                        // Update password directly using active session (no re-auth required)
                                        const { error: updateError } = await withTimeout(
                                            supabase.auth.updateUser({
                                                password: newPassword,
                                            }),
                                            45000
                                        );

                                        if (updateError) {
                                            Alert.alert(
                                                'Error',
                                                updateError.message || 'Failed to change password',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Send reset email',
                                                        onPress: async () => {
                                                            if (user?.email) {
                                                                const { error } = await resetPasswordForEmail(user.email);
                                                                if (error) {
                                                                    Alert.alert('Error', error.message || 'Failed to send reset email');
                                                                } else {
                                                                    Alert.alert('Email sent', 'Check your inbox for a password reset link.');
                                                                }
                                                            }
                                                        },
                                                    },
                                                ]
                                            );
                                            return;
                                        }

                                        Alert.alert('Success', 'Your password has been updated.');
                                        setChangePwdModalVisible(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                    } catch (err: any) {
                                        const message = err?.message || 'An unexpected error occurred';
                                        Alert.alert(
                                            'Network or server issue',
                                            message,
                                            [
                                                { text: 'Dismiss', style: 'cancel' },
                                                {
                                                    text: 'Send reset email',
                                                    onPress: async () => {
                                                        if (user?.email) {
                                                            const { error } = await resetPasswordForEmail(user.email);
                                                            if (error) {
                                                                Alert.alert('Error', error.message || 'Failed to send reset email');
                                                            } else {
                                                                Alert.alert('Email sent', 'Check your inbox for a password reset link.');
                                                            }
                                                        }
                                                    },
                                                },
                                            ]
                                        );
                                    } finally {
                                        setChangingPassword(false);
                                    }
                                }}
                                disabled={changingPassword || !(newPassword.trim() && confirmNewPassword.trim() && newPassword === confirmNewPassword && newPassword.length >= 8 && /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword))}
                            >
                                {changingPassword ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    inputHint: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: BRAND_FONT,
        fontWeight: '700',
        color: palette.textPrimary,
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 16,
        color: palette.textSecondary,
        marginBottom: 20,
        lineHeight: 22,
    },
    modalInput: {
        backgroundColor: palette.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: palette.textPrimary,
        borderWidth: 1,
        borderColor: palette.border,
        marginBottom: 20,
        paddingRight: 44,
    },
    modalInputWrapper: {
        position: 'relative',
        width: '100%',
    },
    modalIconToggle: {
        position: 'absolute',
        right: 10,
        top: 10,
        padding: 6,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: palette.neutralSoft,
    },
    modalButtonDelete: {
        backgroundColor: palette.danger,
    },
    modalButtonDisabled: {
        opacity: 0.6,
    },
    modalButtonCancelText: {
        fontSize: 16,
        fontFamily: BRAND_FONT,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    modalButtonDeleteText: {
        fontSize: 16,
        fontFamily: BRAND_FONT,
        fontWeight: '600',
        color: '#fff',
    },
    helperText: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        marginBottom: 6,
    },
    strengthBar: {
        flex: 1,
        height: 6,
        borderRadius: 999,
        backgroundColor: palette.neutralSoft,
        borderWidth: 1,
        borderColor: palette.border,
    },
    linkButton: {
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    linkText: {
        color: BRAND_COLOR,
        fontWeight: '600',
    },
});

