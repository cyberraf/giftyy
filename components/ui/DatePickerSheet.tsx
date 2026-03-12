import { PickerItem, WheelPicker } from '@/components/ui/WheelPicker';
import { GIFTYY_THEME } from '@/constants/giftyy-theme';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const MONTHS: PickerItem[] = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
];

const SENTINEL_YEAR = 4; // Using 4 (0004) for leap year support when year is omitted

interface DatePickerSheetProps {
    visible: boolean;
    selectedDate: string; // YYYY-MM-DD
    onSelect: (ymd: string) => void;
    onClose: () => void;
    title?: string;
    startYear?: number;
    endYear?: number;
}

export function DatePickerSheet({
    visible,
    selectedDate,
    onSelect,
    onClose,
    title = 'Select date',
    startYear = 1900,
    endYear = new Date().getFullYear() + 5,
}: DatePickerSheetProps) {
    const [y, m, d] = useMemo(() => {
        if (!selectedDate) {
            const now = new Date();
            return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
        }
        const parts = selectedDate.split('-').map(Number);
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) return parts;
        const now = new Date();
        return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    }, [selectedDate, visible]);

    const [tempY, setTempY] = useState(y);
    const [tempM, setTempM] = useState(m);
    const [tempD, setTempD] = useState(d);

    useEffect(() => {
        if (visible) {
            setTempY(y);
            setTempM(m);
            setTempD(d);
        }
    }, [visible, y, m, d]);

    const years = useMemo(() => {
        const list = [];
        // list.push({ label: 'Optional', value: SENTINEL_YEAR }); // Optional year logic might not be needed for DOB
        for (let i = endYear; i >= startYear; i--) {
            if (i === SENTINEL_YEAR) continue;
            list.push({ label: String(i), value: i });
        }
        return list;
    }, [startYear, endYear]);

    const daysInMonth = useMemo(() => {
        // If sentinel year, treat as 4 (leap year) to allow Feb 29
        const yearForCalc = tempY === SENTINEL_YEAR ? 4 : tempY;
        return new Date(yearForCalc, tempM, 0).getDate();
    }, [tempM, tempY]);

    const dayOptions = useMemo<PickerItem[]>(() => {
        return Array.from({ length: daysInMonth }, (_, i) => ({
            label: String(i + 1),
            value: i + 1,
        }));
    }, [daysInMonth]);

    // Adjust day if month change makes it invalid
    useEffect(() => {
        if (tempD > daysInMonth) {
            setTempD(daysInMonth);
        }
    }, [daysInMonth, tempD]);

    const handleConfirm = () => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const yStr = String(tempY).padStart(4, '0');
        onSelect(`${yStr}-${pad(tempM)}-${pad(tempD)}`);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.sheetOverlay}>
                <Pressable style={styles.sheetBackdrop} onPress={onClose} />
                <View style={styles.sheetCard}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{title}</Text>
                        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
                            <Text style={styles.confirmBtnText}>Done</Text>
                        </Pressable>
                    </View>

                    <View style={styles.pickerRow}>
                        <WheelPicker
                            selectedValue={tempM}
                            onValueChange={(val) => setTempM(val as number)}
                            style={styles.flexPicker}
                            items={MONTHS}
                        />

                        <WheelPicker
                            selectedValue={tempD}
                            onValueChange={(val) => setTempD(val as number)}
                            style={styles.fixedPickerSmall}
                            items={dayOptions}
                        />

                        <WheelPicker
                            selectedValue={tempY}
                            onValueChange={(val) => setTempY(val as number)}
                            style={styles.fixedPickerMedium}
                            items={years}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    sheetCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingBottom: 20, // increased for safe area
        maxHeight: '70%',
    },
    sheetHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: GIFTYY_THEME.colors.gray200,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetTitle: { fontSize: 16, fontWeight: '900', color: GIFTYY_THEME.colors.gray900 },
    confirmBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: GIFTYY_THEME.colors.primary,
    },
    confirmBtnText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 14,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 220,
    },
    flexPicker: {
        flex: 1.5,
    },
    fixedPickerSmall: {
        flex: 0.8,
    },
    fixedPickerMedium: {
        flex: 1.2,
    },

});
