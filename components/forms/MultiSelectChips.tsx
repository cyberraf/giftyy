import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type MultiSelectChipsProps = {
    label: string;
    options: readonly string[] | readonly { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    allowCustom?: boolean;
    placeholder?: string;
    maxSelections?: number;
};

export function MultiSelectChips({
    label,
    options,
    selected = [],
    onChange,
    allowCustom = true,
    placeholder = 'Select options...',
    maxSelections,
}: MultiSelectChipsProps) {
    const [customInput, setCustomInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // Custom values not in the predefined options
    const customValues = selected.filter(
        v => !normalizedOptions.some(opt => opt.value === v)
    );

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            if (maxSelections === 1) {
                onChange([value]);
            } else if (maxSelections && selected.length >= maxSelections) {
                return;
            } else {
                onChange([...selected, value]);
            }
        }
    };

    const handleAddCustom = () => {
        const trimmed = customInput.trim();
        if (trimmed && !selected.includes(trimmed)) {
            if (maxSelections === 1) {
                onChange([trimmed]);
            } else {
                onChange([...selected, trimmed]);
            }
            setCustomInput('');
            setShowCustomInput(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {selected.length > 0 && (
                    <Text style={styles.count}>
                        {selected.length}{maxSelections ? `/${maxSelections}` : ''}
                    </Text>
                )}
            </View>

            {/* All chips in a wrap layout — everything visible at once */}
            <View style={styles.chipsWrap}>
                {normalizedOptions.map(option => {
                    const isSelected = selected.includes(option.value);
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => handleToggle(option.value)}
                            activeOpacity={0.7}
                        >
                            {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Custom values */}
                {customValues.map(value => (
                    <TouchableOpacity
                        key={value}
                        style={[styles.chip, styles.chipSelected]}
                        onPress={() => handleToggle(value)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.checkIcon}>✓</Text>
                        <Text style={styles.chipTextSelected}>{value}</Text>
                    </TouchableOpacity>
                ))}

                {/* Add custom */}
                {allowCustom && (
                    <TouchableOpacity
                        style={[styles.chip, styles.chipAdd]}
                        onPress={() => setShowCustomInput(!showCustomInput)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.chipAddText}>+ Custom</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Custom input */}
            {showCustomInput && (
                <View style={styles.customRow}>
                    <TextInput
                        style={styles.customInput}
                        value={customInput}
                        onChangeText={setCustomInput}
                        placeholder="Type here..."
                        placeholderTextColor="#9CA3AF"
                        onSubmitEditing={handleAddCustom}
                        returnKeyType="done"
                        autoFocus
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddCustom}>
                        <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const BRAND = '#f75507';

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    count: {
        fontSize: 13,
        color: BRAND,
        fontWeight: '600',
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: 'rgba(247, 85, 7, 0.08)',
        borderColor: 'rgba(247, 85, 7, 0.35)',
    },
    chipText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    chipTextSelected: {
        fontSize: 14,
        color: BRAND,
        fontWeight: '600',
    },
    checkIcon: {
        fontSize: 11,
        color: BRAND,
        fontWeight: '700',
    },
    chipAdd: {
        backgroundColor: 'transparent',
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    chipAddText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    customRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    customInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FFFFFF',
    },
    addBtn: {
        backgroundColor: BRAND,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        justifyContent: 'center',
    },
    addBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
