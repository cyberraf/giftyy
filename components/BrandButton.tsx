import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { BRAND_COLOR } from '@/constants/theme';

type Props = {
    title: string;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
};

export default function BrandButton({ title, onPress, style, textStyle, disabled }: Props) {
    return (
        <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, disabled && { opacity: 0.6 }, style]}>
            <Text style={[styles.label, textStyle]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: { backgroundColor: BRAND_COLOR, paddingVertical: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    label: { color: 'white', fontWeight: '800' },
});


