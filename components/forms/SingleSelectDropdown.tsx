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

/**
 * Single-select dropdown component for preference selection
 * Allows users to select one option from a curated list
 */
export function SingleSelectDropdown({
    label,
    options,
    selected,
    onChange,
    placeholder = 'Select an option...',
    allowClear = true,
}: SingleSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Normalize options to { value, label } format
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
            >
                <Text style={[styles.selectorText, !selected && styles.selectorPlaceholder]}>
                    {selectedOption?.label || placeholder}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {selected && allowClear && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            )}

            {/* Modal for options */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.modalClose}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.optionsList}>
                            {normalizedOptions.map(option => {
                                const isSelected = option.value === selected;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.option,
                                            isSelected && styles.optionSelected,
                                        ]}
                                        onPress={() => handleSelect(option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                isSelected && styles.optionTextSelected,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Text style={styles.checkmark}>✓</Text>
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

const BRAND_COLOR = '#f75507';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2F2318',
        marginBottom: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(47,35,24,0.2)',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    selectorSelected: {
        borderColor: BRAND_COLOR,
        backgroundColor: 'rgba(224,123,57,0.05)',
    },
    selectorText: {
        fontSize: 15,
        color: '#2F2318',
        flex: 1,
    },
    selectorPlaceholder: {
        color: 'rgba(47,35,24,0.4)',
    },
    arrow: {
        fontSize: 12,
        color: 'rgba(47,35,24,0.5)',
        marginLeft: 8,
    },
    clearButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    clearButtonText: {
        fontSize: 14,
        color: BRAND_COLOR,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2F2318',
    },
    modalClose: {
        fontSize: 32,
        color: 'rgba(47,35,24,0.5)',
        fontWeight: '300',
        lineHeight: 32,
    },
    optionsList: {
        maxHeight: 400,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(47,35,24,0.05)',
    },
    optionSelected: {
        backgroundColor: 'rgba(224,123,57,0.1)',
    },
    optionText: {
        fontSize: 16,
        color: '#2F2318',
        flex: 1,
    },
    optionTextSelected: {
        color: BRAND_COLOR,
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 20,
        color: BRAND_COLOR,
        fontWeight: '700',
    },
});
