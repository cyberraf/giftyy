import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, Text, View } from 'react-native';

export interface PickerItem {
    label: string;
    value: string | number;
}

interface WheelPickerProps {
    items: PickerItem[];
    selectedValue: string | number;
    onValueChange: (value: string | number) => void;
    itemHeight?: number;
    style?: any;
}

export function WheelPicker({ items, selectedValue, onValueChange, itemHeight = 44, style }: WheelPickerProps) {
    if (Platform.OS === 'ios') {
        return (
            <Picker
                selectedValue={selectedValue}
                onValueChange={onValueChange}
                style={style}
                itemStyle={{ fontSize: 18, fontWeight: '700', color: GIFTYY_THEME.colors.gray900 }}
            >
                {items.map((item) => (
                    <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
                ))}
            </Picker>
        );
    }

    // Android & Web fallback JS-based wheel picker
    const scrollViewRef = useRef<ScrollView>(null);
    const [selectedIndex, setSelectedIndex] = useState(() => {
        const index = items.findIndex((i) => i.value === selectedValue);
        return Math.max(0, index);
    });

    // Make sure initial index is correct if it resets
    useEffect(() => {
        const index = items.findIndex((i) => i.value === selectedValue);
        if (index >= 0 && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: index * itemHeight, animated: false });
        }
    }, []); // Only on mount

    useEffect(() => {
        const index = items.findIndex((i) => i.value === selectedValue);
        if (index >= 0 && index !== selectedIndex) {
            setSelectedIndex(index);
            scrollViewRef.current?.scrollTo({ y: index * itemHeight, animated: true });
        }
    }, [selectedValue, items, itemHeight, selectedIndex]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / itemHeight);

        // Boundaries safety
        const safeIndex = Math.max(0, Math.min(index, items.length - 1));

        if (items[safeIndex] && items[safeIndex].value !== selectedValue) {
            setSelectedIndex(safeIndex);
            onValueChange(items[safeIndex].value);
        }
    };

    return (
        <View style={[style, { height: itemHeight * 5, overflow: 'hidden' }]}>
            <View
                style={{
                    position: 'absolute',
                    top: itemHeight * 2,
                    height: itemHeight,
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.04)',
                    borderRadius: 8,
                }}
                pointerEvents="none"
            />
            <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={itemHeight}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScroll}
                onScrollEndDrag={(e) => {
                    if (e.nativeEvent.velocity?.y === 0) handleScroll(e);
                }}
                contentContainerStyle={{ paddingVertical: itemHeight * 2 }}
                nestedScrollEnabled={true}
            >
                {items.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                        <View
                            key={String(item.value)}
                            style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text
                                style={{
                                    fontSize: isSelected ? 18 : 16,
                                    fontWeight: isSelected ? '800' : '500',
                                    color: isSelected ? GIFTYY_THEME.colors.gray900 : GIFTYY_THEME.colors.gray400,
                                }}
                                numberOfLines={1}
                            >
                                {item.label}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}
