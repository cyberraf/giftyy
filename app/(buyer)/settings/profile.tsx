import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { GlassDialog } from '@/components/ui/GlassDialog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { COMMON_COUNTRIES, Country } from '@/constants/countries';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { BRAND_FONT } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/lib/supabase';
import { formatPhoneField } from '@/lib/utils/phone';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generate a unique ID using expo-crypto (compatible with React Native)
const generateUniqueId = async (): Promise<string> => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${Date.now()}-${Math.random()}`);
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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    bio: '',
    profileImage: null,
};

// Convert formatted date (MM/DD/YYYY) to database format (YYYY-MM-DD)
const formatDateForDatabase = (formattedDate: string): string | null => {
    if (!formattedDate) return null;
    const cleaned = formattedDate.replace(/\D/g, '');
    if (cleaned.length !== 8) return null;
    const month = cleaned.slice(0, 2);
    const day = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    return `${year}-${month}-${day}`;
};

// Convert database date (YYYY-MM-DD) to display format (MM/DD/YYYY)
const formatDateFromDatabase = (dbDate: string | null): string => {
    if (!dbDate) return '';
    const match = dbDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[2]}/${match[3]}/${match[1]}`;
    return dbDate;
};

export default function ProfilePreferencesScreen() {
    const { top, bottom } = useSafeAreaInsets();
    const router = useRouter();
    const { profile: authProfile, user, updateProfile: updateAuthProfile, loading: authLoading, deleteAccount } = useAuth();
    const { settings, updateSettings } = useSettings();
    const { alert } = useAlert();
    const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE);
    const [selectedCountry, setSelectedCountry] = useState<Country>(COMMON_COUNTRIES[0]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [changePwdModalVisible, setChangePwdModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
        ]) as T;
    };

    useEffect(() => {
        if (authProfile) {
            let phoneVal = authProfile.phone || '';
            let matchedCountry = COMMON_COUNTRIES[0];
            let digits = phoneVal.replace(/\D/g, '');

            // Try to match the dial_code from the start of the digits
            const sortedCountries = [...COMMON_COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);

            for (const c of sortedCountries) {
                const dial = c.dial_code.replace('+', '');
                if (digits.startsWith(dial)) {
                    matchedCountry = c;
                    digits = digits.slice(dial.length);
                    break;
                }
            }

            setSelectedCountry(matchedCountry);
            setProfile({
                firstName: authProfile.first_name || '',
                lastName: authProfile.last_name || '',
                email: user?.email || '',
                phone: digits,
                dateOfBirth: authProfile.date_of_birth ? formatDateFromDatabase(authProfile.date_of_birth) : '',
                bio: authProfile.bio || '',
                profileImage: authProfile.profile_image_url || null,
            });
            setHasChanges(false);
        }
    }, [authProfile, user]);

    const updateProfile = (updates: Partial<ProfileData>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const [uploadingImage, setUploadingImage] = useState(false);

    const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const uniqueId = await generateUniqueId();
            const fileName = `${uniqueId.substring(0, 16)}.${fileExt}`;
            const filePath = `avatars/${user?.id}/${fileName}`;
            const { error } = await supabase.storage.from('profile_images').upload(filePath, arrayBuffer, { contentType: blob.type, upsert: false });
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('profile_images').getPublicUrl(filePath);
            return publicUrlData.publicUrl;
        } catch (err: any) {
            alert('Upload Error', `Failed to upload image: ${err.message}`);
            return null;
        }
    };

    const deleteImageFromSupabase = async (imageUrl: string): Promise<void> => {
        try {
            const urlParts = imageUrl.split('/profile_images/');
            if (urlParts.length < 2) return;
            const filePath = urlParts[1];
            await supabase.storage.from('profile_images').remove([filePath]);
        } catch (err: any) {
            console.error('Error deleting image:', err);
        }
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission needed', 'We need access to your photos to set a profile picture.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            setUploadingImage(true);
            const uploadedUrl = await uploadImageToSupabase(result.assets[0].uri);
            setUploadingImage(false);
            if (uploadedUrl) {
                if (profile.profileImage?.startsWith('http')) await deleteImageFromSupabase(profile.profileImage);
                updateProfile({ profileImage: uploadedUrl });
            }
        }
    };

    const handleDeleteImage = async () => {
        if (!profile.profileImage) return;
        alert('Delete Profile Picture', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (profile.profileImage?.startsWith('http')) await deleteImageFromSupabase(profile.profileImage);
                    updateProfile({ profileImage: null });
                },
            },
        ]);
    };

    const handleSave = async () => {
        if (!profile.firstName.trim()) {
            alert('Validation error', 'First name is required.');
            return;
        }
        setSaving(true);
        const phoneDigits = profile.phone.replace(/\D/g, '');
        const fullPhone = phoneDigits ? `${selectedCountry.dial_code.replace('+', '')}${phoneDigits}` : null;

        const { error } = await updateAuthProfile({
            first_name: profile.firstName.trim(),
            last_name: profile.lastName.trim(),
            phone: fullPhone,
            date_of_birth: profile.dateOfBirth ? formatDateForDatabase(profile.dateOfBirth) : null,
            bio: profile.bio || null,
            profile_image_url: profile.profileImage || null,
        });
        setSaving(false);
        if (error) alert('Error', error.message);
        else {
            setShowSuccessModal(true);
            setHasChanges(false);
        }
    };

    const getInitials = () => {
        const first = profile.firstName ? profile.firstName.charAt(0).toUpperCase() : '';
        const last = profile.lastName ? profile.lastName.charAt(0).toUpperCase() : '';
        return `${first}${last}`;
    };

    return (
        <View style={styles.screen}>
            <View style={[styles.screen, { paddingTop: top + GIFTYY_THEME.layout.headerHeight }]}>

                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 80 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            <Pressable onPress={handlePickImage} disabled={uploadingImage}>
                                {uploadingImage ? (
                                    <View style={styles.avatarPlaceholder}><ActivityIndicator size="large" color={GIFTYY_THEME.colors.primary} /></View>
                                ) : profile.profileImage ? (
                                    <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitials}>{getInitials()}</Text></View>
                                )}
                                <View style={styles.editBadge}><IconSymbol name="square.and.pencil" size={14} color="#FFF" /></View>
                            </Pressable>
                        </View>
                        {profile.profileImage && !uploadingImage && (
                            <Pressable onPress={handleDeleteImage} style={styles.removePhotoBtn}><Text style={styles.removePhotoText}>Remove photo</Text></Pressable>
                        )}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Personal Information</Text>
                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput style={styles.input} value={profile.firstName} onChangeText={(t) => updateProfile({ firstName: t })} placeholder="First Name" placeholderTextColor={GIFTYY_THEME.colors.gray400} />
                            </View>
                            <View style={styles.formCol}>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput style={styles.input} value={profile.lastName} onChangeText={(t) => updateProfile({ lastName: t })} placeholder="Last Name" placeholderTextColor={GIFTYY_THEME.colors.gray400} />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput style={[styles.input, styles.inputDisabled]} value={profile.email} editable={false} placeholder="Email" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.phoneInputContainer}>
                                <Pressable
                                    style={styles.countryCodeButton}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={styles.countryCodeText}>{selectedCountry.flag} {selectedCountry.dial_code}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={20} color={GIFTYY_THEME.colors.gray600} />
                                </Pressable>
                                <TextInput
                                    style={styles.phoneInput}
                                    value={profile.phone}
                                    onChangeText={(t) => {
                                        const parsed = formatPhoneField(t, selectedCountry.dial_code);
                                        updateProfile({ phone: parsed.replace(/\+/g, '') });
                                    }}
                                    placeholder="555-000-0000"
                                    keyboardType="phone-pad"
                                    placeholderTextColor={GIFTYY_THEME.colors.gray400}
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date of Birth</Text>
                            <Pressable onPress={() => setDatePickerOpen(true)} style={styles.input}>
                                <Text style={{ color: profile.dateOfBirth ? GIFTYY_THEME.colors.gray900 : GIFTYY_THEME.colors.gray400, fontSize: 15 }}>{profile.dateOfBirth || "MM/DD/YYYY"}</Text>
                            </Pressable>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput style={[styles.input, styles.textArea]} value={profile.bio} onChangeText={(t) => updateProfile({ bio: t })} placeholder="Tell us about yourself..." multiline numberOfLines={4} placeholderTextColor={GIFTYY_THEME.colors.gray400} />
                        </View>
                    </View>


                    <Pressable onPress={handleSave} disabled={!hasChanges || saving || authLoading} style={[styles.mainSaveButton, (!hasChanges || saving || authLoading) && styles.mainSaveButtonDisabled]}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.mainSaveButtonText}>Save Changes</Text>}
                    </Pressable>

                    <View style={styles.card}>
                        <Text style={[styles.cardTitle, { color: GIFTYY_THEME.colors.error, marginTop: 20 }]}>Account Security</Text>
                        <Pressable style={styles.securityRow} onPress={() => setChangePwdModalVisible(true)}>
                            <View style={styles.securityInfo}><IconSymbol name="lock.fill" size={20} color={GIFTYY_THEME.colors.gray700} /><Text style={styles.securityLabel}>Change Password</Text></View>
                            <IconSymbol name="chevron.right" size={20} color={GIFTYY_THEME.colors.gray400} />
                        </Pressable>
                        <Pressable style={[styles.securityRow, { borderBottomWidth: 0 }]} onPress={() => setDeleteModalVisible(true)}>
                            <View style={styles.securityInfo}><IconSymbol name="trash.fill" size={20} color={GIFTYY_THEME.colors.error} /><Text style={[styles.securityLabel, { color: GIFTYY_THEME.colors.error }]}>Delete Account</Text></View>
                            <IconSymbol name="chevron.right" size={20} color={GIFTYY_THEME.colors.gray400} />
                        </Pressable>
                    </View>
                </ScrollView>
            </View>

            <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delete Account</Text>
                        <Text style={styles.modalDescription}>Confirm with password:</Text>
                        <TextInput value={deletePassword} onChangeText={setDeletePassword} placeholder="Password" style={styles.modalInput} secureTextEntry={!showDeletePassword} />
                        <View style={styles.modalButtons}>
                            <Pressable style={styles.modalButtonCancel} onPress={() => setDeleteModalVisible(false)}><Text>Cancel</Text></Pressable>
                            <Pressable style={styles.modalButtonDelete} onPress={async () => {
                                setDeleting(true);
                                const { error } = await deleteAccount(deletePassword);
                                setDeleting(false);
                                if (error) alert('Error', error.message);
                            }}>{deleting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Delete</Text>}</Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={changePwdModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New Password" style={styles.modalInput} secureTextEntry={!showNewPassword} />
                        <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} placeholder="Confirm" style={styles.modalInput} secureTextEntry={!showConfirmNewPassword} />
                        <View style={styles.modalButtons}>
                            <Pressable style={styles.modalButtonCancel} onPress={() => setChangePwdModalVisible(false)}><Text>Cancel</Text></Pressable>
                            <Pressable style={[styles.modalButton, { backgroundColor: GIFTYY_THEME.colors.primary }]} onPress={async () => {
                                if (newPassword !== confirmNewPassword) return alert('Error', 'Mismatch');
                                setChangingPassword(true);
                                const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 45000);
                                setChangingPassword(false);
                                if (error) alert('Error', error.message);
                                else setChangePwdModalVisible(false);
                            }}>{changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Update</Text>}</Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View style={styles.pickerModalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCountryPicker(false)} />
                    <View style={styles.pickerModalContent}>
                        <View style={styles.pickerModalHeader}>
                            <Text style={styles.pickerModalTitle}>Select Country</Text>
                            <Pressable onPress={() => setShowCountryPicker(false)}>
                                <MaterialIcons name="close" size={24} color={GIFTYY_THEME.colors.gray900} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={COMMON_COUNTRIES}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.countryItem}
                                    onPress={() => {
                                        setSelectedCountry(item);
                                        setShowCountryPicker(false);
                                        setHasChanges(true);
                                    }}
                                >
                                    <Text style={styles.countryItemText}>
                                        {item.flag} {item.name} ({item.dial_code})
                                    </Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <DatePickerSheet visible={isDatePickerOpen} selectedDate={profile.dateOfBirth ? formatDateForDatabase(profile.dateOfBirth) || '' : ''} onSelect={(ymd) => updateProfile({ dateOfBirth: formatDateFromDatabase(ymd) })} onClose={() => setDatePickerOpen(false)} />
            <GlassDialog visible={showSuccessModal} title="Success" description="Updated!" onClose={() => setShowSuccessModal(false)} singleButton={true} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: GIFTYY_THEME.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', ...GIFTYY_THEME.shadows.sm },
    content: { padding: 20 },
    avatarSection: { alignItems: 'center', marginBottom: 24 },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: GIFTYY_THEME.colors.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFF' },
    avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF' },
    avatarInitials: { fontSize: 32, fontWeight: '700', color: GIFTYY_THEME.colors.gray600 },
    editBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: GIFTYY_THEME.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
    removePhotoBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: GIFTYY_THEME.colors.gray100 },
    removePhotoText: { fontSize: 13, color: GIFTYY_THEME.colors.error, fontWeight: '500' },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: GIFTYY_THEME.colors.gray100, ...GIFTYY_THEME.shadows.sm },
    cardTitle: { fontSize: 16, fontWeight: '700', color: GIFTYY_THEME.colors.gray900, marginBottom: 16, fontFamily: BRAND_FONT },
    formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    formCol: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: GIFTYY_THEME.colors.gray700, marginBottom: 6 },
    input: { backgroundColor: GIFTYY_THEME.colors.gray50, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: GIFTYY_THEME.colors.gray900 },
    inputDisabled: { color: GIFTYY_THEME.colors.gray500 },
    textArea: { height: 100, textAlignVertical: 'top' },
    inputGroup: { marginBottom: 16 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray50 },
    settingInfo: { flex: 1, marginRight: 16 },
    settingLabel: { fontSize: 15, fontWeight: '600', color: GIFTYY_THEME.colors.gray900 },
    settingDescription: { fontSize: 13, color: GIFTYY_THEME.colors.gray500, marginTop: 2 },
    securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray50 },
    securityInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    securityLabel: { fontSize: 15, fontWeight: '600', color: GIFTYY_THEME.colors.gray900 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: GIFTYY_THEME.colors.gray900, marginBottom: 8, textAlign: 'center' },
    modalDescription: { fontSize: 15, color: GIFTYY_THEME.colors.gray600, marginBottom: 24, textAlign: 'center' },
    modalInput: { backgroundColor: GIFTYY_THEME.colors.gray50, borderRadius: 12, padding: 14, fontSize: 16, color: GIFTYY_THEME.colors.gray900, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalButtonCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GIFTYY_THEME.colors.gray100 },
    modalButtonDelete: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GIFTYY_THEME.colors.error },
    mainSaveButton: { backgroundColor: GIFTYY_THEME.colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    mainSaveButtonDisabled: { backgroundColor: GIFTYY_THEME.colors.gray300 },
    mainSaveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: BRAND_FONT },
    phoneInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: GIFTYY_THEME.colors.gray50, borderRadius: 12 },
    countryCodeButton: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingVertical: 12, borderRightWidth: 1, borderRightColor: GIFTYY_THEME.colors.gray200 },
    countryCodeText: { fontSize: 15, color: GIFTYY_THEME.colors.gray900, fontWeight: '600', marginRight: 4 },
    phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: GIFTYY_THEME.colors.gray900 },
    pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    pickerModalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
    pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pickerModalTitle: { fontSize: 20, fontWeight: '800', color: GIFTYY_THEME.colors.gray900 },
    countryItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: GIFTYY_THEME.colors.gray100 },
    countryItemText: { fontSize: 18, color: GIFTYY_THEME.colors.gray900 },
});
