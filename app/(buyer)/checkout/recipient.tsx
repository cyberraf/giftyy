import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Modal, Pressable, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import StepBar from '@/components/StepBar';
import BrandButton from '@/components/BrandButton';
import { useCheckout } from '@/lib/CheckoutContext';
import { useCart } from '@/contexts/CartContext';
import { useRecipients } from '@/contexts/RecipientsContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BRAND_COLOR } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { calculateVendorShippingSync } from '@/lib/shipping-utils';

export default function RecipientScreen() {
    const router = useRouter();
    const { recipient, setRecipient, notifyRecipient, setNotifyRecipient, cardPrice } = useCheckout();
    const { items } = useCart();
    const { recipients } = useRecipients();
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
    const [firstName, setFirstName] = useState(recipient.firstName);
    const [lastName, setLastName] = useState(recipient.lastName);
    const [street, setStreet] = useState(recipient.street);
    const [apartment, setApartment] = useState(recipient.apartment ?? '');
    const [city, setCity] = useState(recipient.city);
    const [stateCode, setStateCode] = useState(recipient.state);
    const [country, setCountry] = useState(recipient.country || 'United States');
    const [zip, setZip] = useState(recipient.zip);
    const [phone, setPhone] = useState(recipient.phone ?? '');
    const [email, setEmail] = useState(recipient.email ?? '');
    const [statePickerVisible, setStatePickerVisible] = useState(false);

    const subtotal = useMemo(
        () => items.reduce((s, it) => s + (parseFloat(it.price.replace(/[^0-9.]/g, '')) || 0) * it.quantity, 0),
        [items]
    );

    function getTaxRateFromState(code: string): number {
        const state = (code || '').toUpperCase();
        switch (state) {
            case 'CA': return 0.085;
            case 'NY': return 0.088;
            case 'TX': return 0.0825;
            case 'FL': return 0.07;
            case 'WA': return 0.092;
            default: return 0.08;
        }
    }

    // Calculate shipping based on vendors (cumulate shipping costs from all vendors)
    const shipping = useMemo(() => {
        return calculateVendorShippingSync(items, 4.99, 50);
    }, [items]);
    const taxRate = useMemo(() => getTaxRateFromState(stateCode), [stateCode]);
    const taxable = Math.max(0, subtotal + (cardPrice || 0));
    const estimatedTax = taxable * taxRate;
    const orderTotal = taxable + estimatedTax + shipping;

    const handleSelectRecipient = (recipientFromList: typeof recipients[0]) => {
        setSelectedRecipientId(recipientFromList.id);
        setFirstName(recipientFromList.firstName);
        setLastName(recipientFromList.lastName || '');
        setStreet(recipientFromList.address);
        setApartment(recipientFromList.apartment || '');
        setCity(recipientFromList.city);
        setStateCode(recipientFromList.state || '');
        setCountry(recipientFromList.country || 'United States');
        setZip(recipientFromList.zip);
        setPhone(recipientFromList.phone || '');
        setEmail(recipientFromList.email || '');
    };

    const handleClearSelection = () => {
        setSelectedRecipientId(null);
        setFirstName('');
        setLastName('');
        setStreet('');
        setApartment('');
        setCity('');
        setStateCode('');
        setCountry('United States');
        setZip('');
        setPhone('');
        setEmail('');
    };

    const onNext = () => {
        if (!firstName || !street || !city || !stateCode || !zip || !country) {
            Alert.alert('Missing info', 'Please fill all required fields');
            return;
        }
        if (notifyRecipient && !phone && !email) {
            Alert.alert('Contact info', 'Provide at least a phone number or an email');
            return;
        }
        setRecipient({ firstName, lastName, street, apartment, city, state: stateCode, country, zip, phone, email });
        router.push('/(buyer)/checkout/video');
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <StepBar current={3} total={6} label="Recipient details" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 + BOTTOM_BAR_TOTAL_SPACE }}>
            <View style={{ padding: 16, gap: 12 }}>
                {/* Saved Recipients Section */}
                {recipients.length > 0 ? (
                    <View style={styles.savedRecipientsSection}>
                        <Text style={styles.sectionTitle}>Select from saved recipients</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientsScroll}>
                            {recipients.map((rec) => {
                                const isSelected = selectedRecipientId === rec.id;
                                return (
                                    <Pressable
                                        key={rec.id}
                                        style={[styles.recipientCard, isSelected && styles.recipientCardSelected]}
                                        onPress={() => handleSelectRecipient(rec)}
                                    >
                                        <View style={styles.recipientCardHeader}>
                                            <View style={[styles.recipientCheckbox, isSelected && styles.recipientCheckboxSelected]}>
                                                {isSelected && <IconSymbol name="checkmark" size={14} color="#FFFFFF" />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.recipientName} numberOfLines={1}>
                                                    {rec.firstName} {rec.lastName || ''}
                                                </Text>
                                                <Text style={styles.recipientRelationship} numberOfLines={1}>
                                                    {rec.relationship}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.recipientAddress} numberOfLines={2}>
                                            {rec.address}{rec.apartment ? `, ${rec.apartment}` : ''}
                                        </Text>
                                        <Text style={styles.recipientLocation} numberOfLines={1}>
                                            {rec.city}, {rec.state || ''} {rec.zip}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        {selectedRecipientId && (
                            <Pressable onPress={handleClearSelection} style={styles.clearSelectionButton}>
                                <Text style={styles.clearSelectionText}>Clear selection</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <View style={styles.addRecipientCTACard}>
                        <View style={styles.addRecipientCTAHeader}>
                            <View style={styles.addRecipientCTAIcon}>
                                <IconSymbol name="person.2.fill" size={24} color={BRAND_COLOR} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.addRecipientCTATitle}>Save recipients for faster checkout</Text>
                                <Text style={styles.addRecipientCTASubtitle}>
                                    Add recipients to your profile to speed up future orders and get personalized gift recommendations
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            style={styles.addRecipientCTAButton}
                            onPress={() => router.push('/(buyer)/(tabs)/profile?tab=Recipients')}
                        >
                            <Text style={styles.addRecipientCTAButtonText}>Add recipients</Text>
                            <IconSymbol name="chevron.right" size={18} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                {recipients.length > 0 && (
                    <Pressable
                        style={styles.addMoreRecipientsButton}
                        onPress={() => router.push('/(buyer)/(tabs)/profile?tab=Recipients')}
                    >
                        <IconSymbol name="plus.circle.fill" size={20} color={BRAND_COLOR} />
                        <Text style={styles.addMoreRecipientsText}>Add more recipients for future orders</Text>
                    </Pressable>
                )}

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Recipient details</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Field label="First name" value={firstName} onChangeText={setFirstName} style={{ flex: 1 }} />
                    <Field label="Last name (optional)" value={lastName} onChangeText={setLastName} style={{ flex: 1 }} />
                </View>
                <Field label="Street address" value={street} onChangeText={setStreet} />
                <Field label="Apt, suite, etc. (optional)" value={apartment} onChangeText={setApartment} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Field label="City" value={city} onChangeText={setCity} style={{ flex: 1 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', marginBottom: 6 }}>State</Text>
                        <Pressable onPress={() => setStatePickerVisible(true)} style={[styles.input, { justifyContent: 'center' }]}>
                            <Text style={{ color: stateCode ? '#111' : '#9ba1a6' }}>{stateCode || 'Select state'}</Text>
                        </Pressable>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Field label="Country" value={country} onChangeText={setCountry} style={{ flex: 1 }} />
                    <Field label="ZIP" value={zip} onChangeText={setZip} style={{ flex: 1 }} keyboardType="number-pad" />
                </View>

                {/* Notify toggle before contact fields */}
                <View style={{ gap: 8 }}>
                    <View style={[styles.rowBetween, { alignItems: 'center' }]}>
                        <Text style={{ fontWeight: '800' }}>Notify recipient</Text>
                        <Switch
                            value={notifyRecipient}
                            onValueChange={setNotifyRecipient}
                            trackColor={{ false: '#E5E7EB', true: '#FFE8DC' }}
                            thumbColor={notifyRecipient ? BRAND_COLOR : '#ffffff'}
                            ios_backgroundColor="#E5E7EB"
                        />
                    </View>
                    <View style={styles.infoCard}>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                            <View style={styles.infoIconCircle}>
                                <IconSymbol name="info.circle" size={16} color={BRAND_COLOR} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoTitle}>Heads up</Text>
                                <Text style={styles.infoText}>
                                    We’ll send a discreet message letting them know a surprise gift from Giftyy is on its way. No item details are included.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {notifyRecipient && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Field label="Phone number" value={phone} onChangeText={setPhone} style={{ flex: 1 }} keyboardType="phone-pad" />
                        <Field label="Email address" value={email} onChangeText={setEmail} style={{ flex: 1 }} keyboardType="email-address" />
                    </View>
                )}

                <View style={styles.summaryCard}>
                    <Text style={{ fontWeight: '900', fontSize: 16 }}>Estimated totals</Text>
                    <View style={styles.rowBetween}>
                        <Text style={styles.muted}>Items subtotal</Text>
                        <Text style={styles.bold}>${subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.muted}>Card price</Text>
                        <Text style={styles.bold}>${(cardPrice || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.muted}>Shipping</Text>
                        <Text style={styles.bold}>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                        <Text style={styles.muted}>Estimated tax ({(taxRate * 100).toFixed(1)}%)</Text>
                        <Text style={styles.bold}>${estimatedTax.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.rowBetween, { marginTop: 6 }]}>
                        <Text style={{ fontWeight: '900' }}>Order total</Text>
                        <Text style={{ fontWeight: '900', fontSize: 18 }}>${orderTotal.toFixed(2)}</Text>
                    </View>
                    <Text style={{ color: '#9ba1a6', marginTop: 4 }}>Tax and shipping are estimated. Final amounts at payment.</Text>
                </View>

                <BrandButton title="Continue" onPress={onNext} />
            </View>
            </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={statePickerVisible} transparent animationType="fade" onRequestClose={() => setStatePickerVisible(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setStatePickerVisible(false)} />
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
                    <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>Select state</Text>
                    <ScrollView style={{ maxHeight: 300 }}>
                        {US_STATES.map((s) => (
                            <Pressable key={s.code} onPress={() => { setStateCode(s.code); setStatePickerVisible(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                <Text style={{ fontWeight: '700' }}>{s.name} ({s.code})</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                    <Pressable onPress={() => setStatePickerVisible(false)} style={{ paddingVertical: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#f75507', fontWeight: '800' }}>Close</Text>
                    </Pressable>
                </View>
            </Modal>
        </View>
    );
}

function Field({ label, multiline, style, ...props }: { label: string; multiline?: boolean; value: string; onChangeText: (t: string) => void; style?: object } & Partial<TextInput['props']>) {
    return (
        <View style={[{ gap: 6 }, style]}>
            <Text style={{ fontWeight: '800' }}>{label}</Text>
            <TextInput {...props} multiline={multiline} style={[styles.input, multiline && { height: 90, textAlignVertical: 'top' }]} placeholderTextColor="#9ba1a6" />
        </View>
    );
}

const styles = StyleSheet.create({
    input: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#fafafa', color: '#111', height: 44 },
    summaryCard: { marginTop: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 14, padding: 12, gap: 6 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    muted: { color: '#6b7280', fontWeight: '700' },
    bold: { fontWeight: '800' },
    infoCard: { backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: '#FFE8DC', borderRadius: 12, padding: 10 },
    infoIconCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE8DC', alignItems: 'center', justifyContent: 'center' },
    infoTitle: { fontWeight: '900', marginBottom: 2, color: '#111827' },
    infoText: { color: '#6b7280', lineHeight: 18 },
    savedRecipientsSection: { gap: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111', marginBottom: 4 },
    recipientsScroll: { gap: 12, paddingRight: 16 },
    recipientCard: {
        width: 280,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    recipientCardSelected: {
        borderColor: BRAND_COLOR,
        backgroundColor: '#FFF7F3',
    },
    recipientCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    recipientCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    recipientCheckboxSelected: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
    },
    recipientName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111',
    },
    recipientRelationship: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '600',
    },
    recipientAddress: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
        marginTop: 4,
    },
    recipientLocation: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    clearSelectionButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    clearSelectionText: {
        color: BRAND_COLOR,
        fontWeight: '700',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 8,
    },
    addRecipientCTACard: {
        backgroundColor: '#FFF7F3',
        borderWidth: 1,
        borderColor: '#FFE8DC',
        borderRadius: 14,
        padding: 16,
        gap: 12,
    },
    addRecipientCTAHeader: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    addRecipientCTAIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFE8DC',
    },
    addRecipientCTATitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#111',
        marginBottom: 4,
    },
    addRecipientCTASubtitle: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    addRecipientCTAButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND_COLOR,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 6,
    },
    addRecipientCTAButtonText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 15,
    },
    addMoreRecipientsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
    },
    addMoreRecipientsText: {
        color: BRAND_COLOR,
        fontWeight: '700',
        fontSize: 14,
    },
});

const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];


