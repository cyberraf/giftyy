import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SingleSelectDropdownProps = {
    label: string;
    options: readonly string[] | readonly { value: string; label: string }[];
    selected?: string;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    allowClear?: boolean;
};

export function SingleSelectDropdown({
    label,
    options,
    selected,
    onChange,
    placeholder = 'Select an option...',
    allowClear = true,
}: SingleSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === selected);

    const handleSelect = (value: string) => {
        onChange(value);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(undefined);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[styles.selector, selected && styles.selectorSelected]}
                onPress={() => setIsOpen(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.selectorText, !selected && styles.selectorPlaceholder]}>
                    {selectedOption?.label || placeholder}
                </Text>
                <Text style={styles.arrow}>▾</Text>
            </TouchableOpacity>

            {selected && allowClear && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            )}

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.sheetClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                            {normalizedOptions.map(option => {
                                const isSelected = option.value === selected;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.option, isSelected && styles.optionSelected]}
                                        onPress={() => handleSelect(option.value)}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <View style={styles.checkCircle}>
                                                <Text style={styles.checkMark}>✓</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const BRAND = '#f75507';

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
    },
    selectorSelected: {
        borderColor: 'rgba(247, 85, 7, 0.35)',
        backgroundColor: 'rgba(247, 85, 7, 0.04)',
    },
    selectorText: {
        fontSize: 15,
        color: '#1F2937',
        flex: 1,
        fontWeight: '500',
    },
    selectorPlaceholder: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
    arrow: {
        fontSize: 16,
        color: '#9CA3AF',
        marginLeft: 8,
    },
    clearButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    clearButtonText: {
        fontSize: 13,
        color: BRAND,
        fontWeight: '600',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '65%',
        paddingBottom: 34,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    sheetClose: {
        fontSize: 18,
        color: '#9CA3AF',
        padding: 4,
    },
    optionsList: {
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
        borderRadius: 12,
        marginBottom: 2,
    },
    optionSelected: {
        backgroundColor: 'rgba(247, 85, 7, 0.06)',
    },
    optionText: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
    },
    optionTextSelected: {
        color: BRAND,
        fontWeight: '600',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: BRAND,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkMark: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700',
    },
});
