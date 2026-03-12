import { IconSymbol } from '@/components/ui/icon-symbol';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { responsiveFontSize, scale, verticalScale } from '@/utils/responsive';
import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface RelationshipPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (relationship: string, nickname?: string) => void;
    title?: string;
    subtitle?: string;
    selectedRelationship?: string;
    targetName?: string;
}

export function RelationshipPickerModal({
    visible,
    onClose,
    onSelect,
    title = "How do you know them?",
    subtitle = "Select a relationship to connect",
    selectedRelationship,
    targetName
}: RelationshipPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [nickname, setNickname] = useState('');
    const [step, setStep] = useState<'relationship' | 'nickname'>('relationship');
    const [tempRelationship, setTempRelationship] = useState<string | null>(null);

    const categorizedRelationships = useMemo(() => {
        const categories = [
            { title: 'Immediate Family', data: ['Mother', 'Father', 'Sister', 'Brother', 'Daughter', 'Son', 'Grandmother', 'Grandfather'] },
            { title: 'Romantic', data: ['Wife', 'Husband', 'Girlfriend', 'Boyfriend', 'Fiancée', 'Fiancé'] },
            { title: 'Extended Family', data: ['Auntie', 'Uncle', 'Niece', 'Nephew', 'Cousin'] },
            { title: 'Special Connections', data: ['Godmother', 'Godfather'] },
            { title: 'Social & Professional', data: ['Friend', 'Colleague', 'Other'] },
        ];

        if (!searchQuery) return categories;

        const query = searchQuery.toLowerCase();
        return categories.map(cat => ({
            ...cat,
            data: cat.data.filter(opt => opt.toLowerCase().includes(query))
        })).filter(cat => cat.data.length > 0);
    }, [searchQuery]);

    const handleSelectRelationship = (relationship: string) => {
        setTempRelationship(relationship);
        setStep('nickname');
    };

    const handleConfirm = () => {
        if (!tempRelationship) return;
        onSelect(tempRelationship, nickname.trim() || undefined);
        handleClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        setNickname('');
        setStep('relationship');
        setTempRelationship(null);
        onClose();
    };

    const renderRelationshipStep = () => (
        <>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.searchContainer}>
                <IconSymbol name="magnifyingglass" size={16} color={GIFTYY_THEME.colors.gray400} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search relationships..."
                    placeholderTextColor={GIFTYY_THEME.colors.gray400}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                />
            </View>

            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {categorizedRelationships.map((cat, idx) => (
                    <View key={cat.title} style={idx > 0 && { marginTop: verticalScale(16) }}>
                        <Text style={styles.categoryTitle}>{cat.title}</Text>
                        <View style={styles.categoryContainer}>
                            {cat.data.map((option, optIdx) => (
                                <Pressable
                                    key={option}
                                    style={[
                                        styles.option,
                                        optIdx === 0 && { borderTopWidth: 0 },
                                        tempRelationship === option && styles.optionSelected
                                    ]}
                                    onPress={() => handleSelectRelationship(option)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        tempRelationship === option && styles.optionTextSelected
                                    ]}>{option}</Text>
                                    <IconSymbol
                                        name={tempRelationship === option ? "checkmark" : "chevron.right"}
                                        size={14}
                                        color={tempRelationship === option ? GIFTYY_THEME.colors.primary : GIFTYY_THEME.colors.gray300}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}
                {categorizedRelationships.length === 0 && (
                    <View style={styles.emptySearch}>
                        <Text style={styles.emptyText}>No matching relationships</Text>
                    </View>
                )}
            </ScrollView>
        </>
    );

    const renderNicknameStep = () => (
        <View style={styles.nicknameStepContainer}>
            <Pressable style={styles.backButton} onPress={() => setStep('relationship')}>
                <IconSymbol name="chevron.left" size={20} color={GIFTYY_THEME.colors.gray600} />
                <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            <View style={styles.header}>
                <Text style={styles.title}>
                    {targetName ? `Nickname for ${targetName.split(' ')[0]}` : 'Add a nickname'}
                </Text>
                <Text style={styles.subtitle}>
                    {targetName
                        ? `How should ${targetName.split(' ')[0]} show up in your circle?`
                        : `How should your ${tempRelationship?.toLowerCase()} show up in your circle?`}
                </Text>
            </View>

            <View style={styles.nicknameInputWrapper}>
                <TextInput
                    style={styles.nicknameInputLarge}
                    placeholder="Nickname (Optional)"
                    placeholderTextColor={GIFTYY_THEME.colors.gray400}
                    value={nickname}
                    onChangeText={setNickname}
                    autoCorrect={false}
                    autoFocus
                    maxLength={30}
                />
            </View>

            <Pressable
                style={styles.confirmButton}
                onPress={handleConfirm}
            >
                <Text style={styles.confirmButtonText}>Save & Continue</Text>
            </Pressable>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior="padding"
                style={styles.overlay}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <View style={[styles.card, step === 'nickname' && styles.cardNicknameStep]}>
                    {step === 'relationship' ? renderRelationshipStep() : renderNicknameStep()}

                    {step === 'relationship' && (
                        <Pressable
                            style={styles.cancelButton}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(20),
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        width: '100%',
        maxHeight: '85%',
        backgroundColor: '#FFF',
        borderRadius: scale(28),
        padding: scale(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    cardNicknameStep: {
        maxHeight: '50%',
    },
    header: {
        marginBottom: verticalScale(16),
    },
    title: {
        fontSize: responsiveFontSize(20),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray900,
        textAlign: 'center',
        marginBottom: verticalScale(4),
    },
    subtitle: {
        fontSize: responsiveFontSize(14),
        color: GIFTYY_THEME.colors.gray500,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: scale(12),
        paddingHorizontal: scale(12),
        height: verticalScale(44),
        marginBottom: verticalScale(16),
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    searchInput: {
        flex: 1,
        marginLeft: scale(8),
        fontSize: responsiveFontSize(15),
        color: GIFTYY_THEME.colors.gray900,
        height: '100%',
    },
    nicknameStepContainer: {
        width: '100%',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    backButtonText: {
        fontSize: responsiveFontSize(14),
        color: GIFTYY_THEME.colors.gray600,
        fontWeight: '600',
        marginLeft: 4,
    },
    nicknameInputWrapper: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: scale(16),
        paddingHorizontal: scale(16),
        height: verticalScale(56),
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: GIFTYY_THEME.colors.gray100,
        marginBottom: verticalScale(20),
    },
    nicknameInputLarge: {
        fontSize: responsiveFontSize(18),
        color: GIFTYY_THEME.colors.gray900,
        fontWeight: '700',
    },
    confirmButton: {
        backgroundColor: GIFTYY_THEME.colors.primary,
        height: verticalScale(56),
        borderRadius: scale(16),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: GIFTYY_THEME.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonText: {
        fontSize: responsiveFontSize(16),
        fontWeight: '800',
        color: '#FFF',
    },
    list: {
        width: '100%',
    },
    listContent: {
        paddingBottom: verticalScale(10),
    },
    categoryTitle: {
        fontSize: responsiveFontSize(13),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(8),
        paddingLeft: scale(4),
    },
    categoryContainer: {
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: scale(16),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: GIFTYY_THEME.colors.gray100,
    },
    option: {
        width: '100%',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    optionSelected: {
        backgroundColor: 'rgba(247, 85, 7, 0.05)',
    },
    optionText: {
        fontSize: responsiveFontSize(15),
        fontWeight: '700',
        color: GIFTYY_THEME.colors.gray800,
    },
    optionTextSelected: {
        color: GIFTYY_THEME.colors.primary,
        fontWeight: '800',
    },
    emptySearch: {
        paddingVertical: verticalScale(40),
        alignItems: 'center',
    },
    emptyText: {
        color: GIFTYY_THEME.colors.gray400,
        fontSize: responsiveFontSize(15),
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(12),
        alignItems: 'center',
        backgroundColor: GIFTYY_THEME.colors.gray50,
        borderRadius: scale(16),
    },
    cancelText: {
        fontSize: responsiveFontSize(16),
        fontWeight: '800',
        color: GIFTYY_THEME.colors.gray500,
    },
});
