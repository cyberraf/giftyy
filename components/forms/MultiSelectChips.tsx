import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type MultiSelectChipsProps = {
    label: string;
    options: readonly string[] | readonly { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    allowCustom?: boolean;
    placeholder?: string;
    maxSelections?: number;
};

/**
 * Multi-select chips component for preference selection
 * Allows users to select multiple options from a curated list
 */
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

    // Normalize options to { value, label } format
    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            // Deselect
            onChange(selected.filter(v => v !== value));
        } else {
            // Select
            if (maxSelections === 1) {
                // For single select, replace the current selection
                onChange([value]);
            } else if (maxSelections && selected.length >= maxSelections) {
                return; // Don't allow more selections
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

    const handleRemoveCustom = (value: string) => {
        // Remove custom values that aren't in the predefined options
        const isPredefined = normalizedOptions.some(opt => opt.value === value);
        if (!isPredefined) {
            onChange(selected.filter(v => v !== value));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            {selected.length > 0 && (
                <Text style={styles.selectedCount}>
                    {selected.length} selected
                    {maxSelections ? ` (max ${maxSelections})` : ''}
                </Text>
            )}

            {/* Selected chips (at top for visibility) */}
            {selected.length > 0 && (
                <View style={styles.selectedChipsContainer}>
                    {selected.map(value => {
                        const option = normalizedOptions.find(opt => opt.value === value);
                        const isCustom = !option;
                        return (
                            <TouchableOpacity
                                key={value}
                                style={[styles.chip, styles.chipSelected]}
                                onPress={() => handleToggle(value)}
                            >
                                <Text style={styles.chipTextSelected}>
                                    {option?.label || value}
                                </Text>
                                {isCustom && (
                                    <TouchableOpacity
                                        onPress={() => handleRemoveCustom(value)}
                                        style={styles.removeButton}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Available options */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScroll}
                contentContainerStyle={styles.optionsContainer}
            >
                {normalizedOptions.map(option => {
                    const isSelected = selected.includes(option.value);
                    if (isSelected) return null; // Don't show selected items in available list

                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.chip, styles.chipAvailable]}
                            onPress={() => handleToggle(option.value)}
                        >
                            <Text style={styles.chipTextAvailable}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Add custom button */}
                {allowCustom && (
                    <TouchableOpacity
                        style={[styles.chip, styles.chipCustom]}
                        onPress={() => setShowCustomInput(!showCustomInput)}
                    >
                        <Text style={styles.chipTextCustom}>+ Add Custom</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Custom input field */}
            {showCustomInput && (
                <View style={styles.customInputContainer}>
                    <TextInput
                        style={styles.customInput}
                        value={customInput}
                        onChangeText={setCustomInput}
                        placeholder="Enter custom option..."
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        onSubmitEditing={handleAddCustom}
                        returnKeyType="done"
                        autoFocus
                    />
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddCustom}
                    >
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>
            )}

            {selected.length === 0 && (
                <Text style={styles.placeholder}>{placeholder}</Text>
            )}
        </View>
    );
}

const BRAND_COLOR = '#E07B39';

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
    selectedCount: {
        fontSize: 13,
        color: BRAND_COLOR,
        marginBottom: 8,
        fontWeight: '500',
    },
    selectedChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    optionsScroll: {
        marginBottom: 8,
    },
    optionsContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chipAvailable: {
        backgroundColor: '#374151',
    },
    chipSelected: {
        backgroundColor: BRAND_COLOR,
    },
    chipCustom: {
        backgroundColor: '#4B5563',
    },
    chipTextAvailable: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    chipTextSelected: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    chipTextCustom: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    removeButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
        lineHeight: 18,
    },
    customInputContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    customInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FFFFFF',
    },
    addButton: {
        backgroundColor: BRAND_COLOR,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    placeholder: {
        fontSize: 14,
        color: 'rgba(0,0,0,0.3)',
        fontStyle: 'italic',
        marginTop: 4,
        display: 'none', // Hide placeholder
    },
});
