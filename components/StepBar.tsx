import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StepBar({ current, total, label }: { current: number; total: number; label?: string }) {
    const { top } = useSafeAreaInsets();
    const pct = (current / total) * 100;
    return (
        <View style={{ paddingTop: top + 64, backgroundColor: 'white' }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                <Text style={{ fontWeight: '800' }}>{label}</Text>
                <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                    <View style={{ width: `${pct}%`, backgroundColor: '#f75507', flex: 1 }} />
                </View>
                <Text style={{ marginTop: 6, color: '#6b7280' }}>Step {current} of {total}</Text>
            </View>
        </View>
    );
}


