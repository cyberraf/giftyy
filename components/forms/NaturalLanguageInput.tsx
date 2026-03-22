import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type NaturalLanguageInputProps = {
    placeholder?: string;
    onSubmit: (text: string) => void;
    multiline?: boolean;
    autoFocus?: boolean;
};

/**
 * Natural Language Input Component
 * Allows users to type freely with smart parsing
 */
export function NaturalLanguageInput({
    placeholder = "Type anything...",
    onSubmit,
    multiline = false,
    autoFocus = false,
}: NaturalLanguageInputProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text.trim());
            setText('');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Text style={styles.label}>💬 Or type freely:</Text>
                <TextInput
                    style={[styles.input, multiline && styles.inputMultiline]}
                    value={text}
                    onChangeText={setText}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                    autoFocus={autoFocus}
                    returnKeyType={multiline ? 'default' : 'done'}
                    onSubmitEditing={!multiline ? handleSubmit : undefined}
                    blurOnSubmit={!multiline}
                />
                {text.trim().length > 0 && (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.submitButtonText}>Add →</Text>
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.hint}>
                Example: "loves yoga and photography" or "vegan, allergic to nuts"
            </Text>
        </View>
    );
}

const BRAND_COLOR = '#f75507';

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: 'rgba(47,35,24,0.2)',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        padding: 12,
    },
    label: {
        fontSize: 14,
        color: 'rgba(47,35,24,0.7)',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        fontSize: 16,
        color: '#2F2318',
        paddingVertical: 8,
        paddingHorizontal: 4,
        minHeight: 40,
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        color: 'rgba(47,35,24,0.5)',
        fontStyle: 'italic',
        marginTop: 8,
        lineHeight: 18,
    },
});
