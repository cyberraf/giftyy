import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { BRAND_COLOR, BRAND_FONT } from '@/constants/theme';
import { BOTTOM_BAR_TOTAL_SPACE } from '@/constants/bottom-bar';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { useRecipients, type Recipient as RecipientType } from '@/contexts/RecipientsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useVideoMessages } from '@/contexts/VideoMessagesContext';

const tabs = ['Overview', 'Orders', 'Recipients', 'Settings'] as const;
type TabKey = (typeof tabs)[number];

const TAB_CONFIG: { key: TabKey; icon: IconSymbolName }[] = [
    { key: 'Overview', icon: 'rectangle.grid.2x2' },
    { key: 'Orders', icon: 'doc.plaintext' },
    { key: 'Recipients', icon: 'person.2.fill' },
    { key: 'Settings', icon: 'gearshape.fill' },
];

const palette = {
    background: '#F5F4F2',
    card: '#FFFFFF',
    cardAlt: '#F9F5F2',
    textPrimary: '#2F2318',
    textSecondary: '#766A61',
    border: '#E6DED6',
    accentSoft: '#FCEEE7',
    neutralSoft: '#ECE7E2',
    success: '#10B981',
};

const COUNTRY_LIST = [
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cabo Verde',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo (Republic)',
    'Congo (Democratic Republic)',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Korea (North)',
    'Korea (South)',
    'Kosovo',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Vatican City',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe',
];

const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
    'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'American Samoa', 'Guam',
    'Northern Mariana Islands', 'Puerto Rico', 'U.S. Virgin Islands'
];

const CANADA_PROVINCES = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories',
    'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
];

const AUSTRALIA_STATES = [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia',
    'Tasmania', 'Victoria', 'Western Australia'
];

const INDIA_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const normalizeCountry = (country: string) => country.trim().toUpperCase();

const COUNTRY_STATE_OPTIONS: Record<string, string[]> = {
    'UNITED STATES': US_STATES,
    'UNITED STATES OF AMERICA': US_STATES,
    'USA': US_STATES,
    'CANADA': CANADA_PROVINCES,
    'AUSTRALIA': AUSTRALIA_STATES,
    'INDIA': INDIA_STATES,
};

const getStateOptionsForCountry = (country: string) => {
    const normalized = normalizeCountry(country);
    return COUNTRY_STATE_OPTIONS[normalized] ?? [];
};

const requiresStateField = (country: string) => getStateOptionsForCountry(country).length > 0;

// Use Recipient type from context
type Recipient = RecipientType;

type RecipientCardProps = Omit<Recipient, 'id'> & { onEdit: () => void; onDelete: () => void; isEditing: boolean };

type RecipientFormState = Omit<Recipient, 'id'>;

const INITIAL_RECIPIENTS: Recipient[] = [
    {
        id: 'rec-1',
        firstName: 'Jordan',
        lastName: 'Miles',
        relationship: 'Best friend',
        email: 'jordan.miles@email.com',
        phone: '(415) 594-3021',
        address: '238 Market Street',
        apartment: 'Apt 5B',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zip: '94107',
        sports: 'Running, tennis',
        hobbies: 'Photography, hiking',
        favoriteColors: 'Terracotta, sage',
        favoriteArtists: 'Taylor Swift, Norah Jones',
        notes: 'Allergic to peanuts. Loves coffee.',
    },
    {
        id: 'rec-2',
        firstName: 'Carmen',
        lastName: 'Diaz',
        relationship: 'Sister',
        email: 'carmen.diaz@email.com',
        phone: '(323) 882-1188',
        address: '1090 Palm Drive',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        zip: '90015',
        sports: 'Yoga',
        hobbies: 'Travel, art museums',
        favoriteColors: 'Blush, navy',
        favoriteArtists: 'Lorde, Adele',
        notes: '',
    },
];

export default function ProfileScreen() {
	const { top } = useSafeAreaInsets();
    const params = useLocalSearchParams<{ tab?: string }>();
    const [activeTab, setActiveTab] = useState<TabKey>('Overview');

    // Set active tab from URL parameter
    useEffect(() => {
        if (params.tab && tabs.includes(params.tab as TabKey)) {
            setActiveTab(params.tab as TabKey);
        }
    }, [params.tab]);

	const { bottom } = useSafeAreaInsets();
	const { profile: authProfile, user } = useAuth();
	const { videoMessages } = useVideoMessages();
	
	const displayName = useMemo(() => {
		if (authProfile?.first_name) {
			return authProfile.first_name;
		}
		if (user?.email) {
			return user.email.split('@')[0];
		}
		return 'User';
	}, [authProfile, user]);

	const displayInitials = useMemo(() => {
		if (authProfile?.first_name && authProfile?.last_name) {
			return `${authProfile.first_name.charAt(0)}${authProfile.last_name.charAt(0)}`.toUpperCase();
		}
		if (authProfile?.first_name) {
			return authProfile.first_name.charAt(0).toUpperCase();
		}
		if (user?.email) {
			return user.email.charAt(0).toUpperCase();
		}
		return 'U';
	}, [authProfile, user]);

	const fullName = useMemo(() => {
		if (authProfile?.first_name && authProfile?.last_name) {
			return `${authProfile.first_name} ${authProfile.last_name}`;
		}
		if (authProfile?.first_name) {
			return authProfile.first_name;
		}
		if (user?.email) {
			return user.email.split('@')[0];
		}
		return 'User';
	}, [authProfile, user]);

	const joinedSince = useMemo(() => {
		if (authProfile?.created_at) {
			const date = new Date(authProfile.created_at);
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
		}
		if (user?.created_at) {
			const date = new Date(user.created_at);
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
		}
		return null;
	}, [authProfile, user]);

	const membershipStatus = useMemo(() => {
		// TODO: Get actual subscription status from profile or subscription table
		return 'Premium'; // Placeholder
	}, []);

	const memoriesSent = useMemo(() => {
		return videoMessages.filter(vm => vm.direction === 'sent').length;
	}, [videoMessages]);

	const memoriesReceived = useMemo(() => {
		return videoMessages.filter(vm => vm.direction === 'received').length;
	}, [videoMessages]);

	return (
        <View style={[styles.screen, { paddingTop: top + 8 }]}> 
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + BOTTOM_BAR_TOTAL_SPACE + 20 }]}>
                <View style={styles.heroCard}>
                    {/* Top Section: Badges */}
                    <View style={styles.heroTopSection}>
                        {joinedSince && (
                            <View style={styles.heroMetaBadge}>
                                <IconSymbol name="calendar" size={12} color={palette.textSecondary} />
                                <Text style={styles.heroMetaText}>Joined {joinedSince}</Text>
                            </View>
                        )}
                        <View style={[styles.heroMetaBadge, styles.heroMembershipBadge]}>
                            <IconSymbol name="star.fill" size={12} color="#FFFFFF" />
                            <Text style={styles.heroMembershipText}>{membershipStatus}</Text>
                        </View>
                    </View>

                    {/* Main Content Section */}
                    <View style={styles.heroMainContent}>
                        {/* Profile Picture with subtle shadow */}
                        <View style={styles.heroAvatarWrapper}>
                            {authProfile?.profile_image_url ? (
                                <Image 
                                    source={{ uri: authProfile.profile_image_url }} 
                                    style={styles.heroAvatarImage}
                                />
                            ) : (
                                <View style={styles.heroAvatarBubble}>
                                    <Text style={styles.heroAvatarInitials}>{displayInitials}</Text>
                                </View>
                            )}
                            <View style={styles.heroAvatarRing} />
                        </View>

                        {/* User Info */}
                        <View style={styles.heroInfoContainer}>
                            <Text style={styles.heroFullName}>{fullName}</Text>
                            {authProfile?.email && (
                                <Text style={styles.heroEmail}>{authProfile.email}</Text>
                            )}
                            
                            {/* Stats Row with improved design */}
                            <View style={styles.heroStatsContainer}>
                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{memoriesSent}</Text>
                                    <Text style={styles.heroStatLabel}>Sent</Text>
                                </View>
                                
                                <View style={styles.heroStatCard}>
                                    <Text style={styles.heroStatValue}>{memoriesReceived}</Text>
                                    <Text style={styles.heroStatLabel}>Received</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.tabBar}>
                    {TAB_CONFIG.map(({ key, icon }) => {
                        const active = key === activeTab;
                        return (
                            <Pressable
                                key={key}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                onPress={() => setActiveTab(key)}
                                accessibilityRole="button"
                                accessibilityLabel={key}
                                accessibilityState={active ? { selected: true } : {}}
                            >
                                <IconSymbol
                                    name={icon}
                                    size={22}
                                    color={active ? '#ffffff' : palette.textSecondary}
                                />
                                <Text style={styles.tabLabelHidden}>{key}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {activeTab === 'Overview' && <OverviewPanel onTabChange={setActiveTab} />}
                {activeTab === 'Orders' && <OrdersPanel />}
                {activeTab === 'Recipients' && <RecipientsPanel />}
                {activeTab === 'Settings' && <SettingsPanel />}
            </ScrollView>
        </View>
    );
}

function OverviewPanel({ onTabChange }: { onTabChange?: (tab: TabKey) => void }) {
    const router = useRouter();
    
    // Mock data - in a real app, this would come from state/API
    const accountStats = {
        totalOrders: 12,
        activeDeliveries: 2,
        memoriesSaved: 18,
        recipientsCount: 5,
        subscriptionPlan: 'Premium',
        memberSince: '2023-01-15',
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'orders':
                onTabChange?.('Orders');
                break;
            case 'recipients':
                onTabChange?.('Recipients');
                break;
            case 'settings':
                onTabChange?.('Settings');
                break;
            case 'memories':
                router.push('/(buyer)/(tabs)/memory');
                break;
            case 'subscription':
                router.push('/(buyer)/subscription');
                break;
            case 'order-tracker':
                router.push('/(buyer)/order-tracker');
                break;
        }
    };

    return (
        <View style={styles.sectionGap}>
            {/* Quick Actions */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Quick actions</Text>
                <View style={styles.quickGrid}>
                    <QuickActionButton 
                        onPress={() => handleQuickAction('orders')}
                        title="Orders"
                        subtitle="View all orders"
                        icon="doc.plaintext"
                    />
                    <QuickActionButton 
                        onPress={() => handleQuickAction('recipients')}
                        title="Recipients"
                        subtitle="Manage contacts"
                        icon="person.2.fill"
                    />
                    <QuickActionButton 
                        onPress={() => handleQuickAction('memories')}
                        title="Memories"
                        subtitle="Video messages"
                        icon="camera.fill"
                    />
                    <QuickActionButton 
                        onPress={() => handleQuickAction('subscription')}
                        title="Subscription"
                        subtitle="Plan & billing"
                        icon="creditcard.fill"
                    />
                    <QuickActionButton 
                        onPress={() => handleQuickAction('order-tracker')}
                        title="Track orders"
                        subtitle="Live status & ETA"
                        icon="magnifyingglass"
                    />
                    <QuickActionButton 
                        onPress={() => handleQuickAction('settings')}
                        title="Settings"
                        subtitle="Preferences"
                        icon="gearshape.fill"
                    />
                </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Recent activity</Text>
                <View style={styles.activityList}>
                    <ActivityItem 
                        icon="checkmark.circle.fill"
                        title="Order delivered"
                        subtitle="GIF-7MT912 • Jul 12"
                        color={palette.success}
                    />
                    <ActivityItem 
                        icon="doc.plaintext"
                        title="Order shipped"
                        subtitle="GIF-8Y2KQ1 • In transit"
                        color={BRAND_COLOR}
                    />
                    <ActivityItem 
                        icon="camera.fill"
                        title="Memory saved"
                        subtitle="New video message • Jul 10"
                        color={palette.textSecondary}
                    />
                </View>
            </View>
        </View>
    );
}

function OrdersPanel() {
    const { orders, loading } = useOrders();

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'processing': return 'Processing';
            case 'confirmed': return 'Confirmed';
            case 'shipped': return 'Shipped';
            case 'out_for_delivery': return 'Out for delivery';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const getEtaDisplay = (order: any) => {
        if (order.deliveredAt) {
            return `Delivered ${new Date(order.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.estimatedDeliveryDate) {
            return `Arrives ${new Date(order.estimatedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (order.status === 'out_for_delivery') {
            return 'Arrives soon';
        }
        if (order.status === 'shipped') {
            return 'In transit';
        }
        if (order.status === 'processing' || order.status === 'confirmed') {
            return 'Label created';
        }
        return 'Processing';
    };

    if (loading) {
        return (
            <View style={styles.sectionGap}>
                <View style={styles.groupCard}>
                    <Text style={styles.groupTitle}>Recent orders</Text>
                    <Text style={{ color: palette.textSecondary, paddingVertical: 20 }}>Loading orders...</Text>
                </View>
            </View>
        );
    }

    if (orders.length === 0) {
        return (
            <View style={styles.sectionGap}>
                <View style={styles.groupCard}>
                    <Text style={styles.groupTitle}>Recent orders</Text>
                    <Text style={{ color: palette.textSecondary, paddingVertical: 20 }}>No orders yet. Start shopping to see your orders here!</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Recent orders</Text>
                {orders.map((order) => (
                    <OrderRow
                        key={order.id}
                        code={order.orderCode}
                        status={getStatusDisplay(order.status)}
                        eta={getEtaDisplay(order)}
                        href={`/(buyer)/orders/${order.id}`}
                    />
                ))}
            </View>
            <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>Download order history</Text>
            </Pressable>
        </View>
    );
}

function SettingsPanel() {
    const router = useRouter();
    const { signOut } = useAuth();

    const handleSignOut = async () => {
        Alert.alert(
            'Sign out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account settings</Text>
                <SettingsLinkRow 
                    onPress={() => router.push('/(buyer)/settings/profile')}
                    label="Profile & preferences"
                    icon="person.circle.fill"
                    subtitle="Update your personal information"
                />
                <SettingsLinkRow 
                    onPress={() => router.push('/(buyer)/settings/addresses')}
                    label="Saved addresses"
                    icon="location.fill"
                    subtitle="Manage your delivery addresses"
                />
                <SettingsLinkRow 
                    onPress={() => router.push('/(buyer)/subscription')}
                    label="Subscription"
                    icon="creditcard.fill"
                    subtitle="Manage your subscription plan"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Security</Text>
                <SettingsLinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Password change feature coming soon')}
                    label="Change password"
                    icon="lock.fill"
                    subtitle="Update your account password"
                />
                <SettingsLinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Two-factor authentication coming soon')}
                    label="Two-factor authentication"
                    icon="shield.fill"
                    subtitle="Add an extra layer of security"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Notification preferences</Text>
                <SettingsNotificationsPanel />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Privacy settings</Text>
                <SettingsLinkRow 
                    onPress={() => router.push('/(buyer)/settings/privacy')}
                    label="Privacy policy"
                    icon="hand.raised.fill"
                    subtitle="Read our privacy policy"
                />
                <SettingsLinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Terms of service coming soon')}
                    label="Terms of service"
                    icon="doc.plaintext.fill"
                    subtitle="Read our terms of service"
                />
                <SettingsLinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Data management coming soon')}
                    label="Data management"
                    icon="tray.full.fill"
                    subtitle="Manage your data"
                />
            </View>

            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Account data</Text>
                <SettingsLinkRow 
                    onPress={() => Alert.alert('Coming soon', 'Export data feature coming soon')}
                    label="Export data"
                    icon="square.and.arrow.up.fill"
                    subtitle="Download your account data"
                />
                <Pressable 
                    style={styles.dangerLinkRow}
                    onPress={() => Alert.alert(
                        'Delete account',
                        'Are you sure you want to delete your account? This action cannot be undone.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Coming soon', 'Account deletion coming soon') },
                        ]
                    )}
                >
                    <View style={styles.dangerLinkContent}>
                        <IconSymbol name="trash.fill" size={20} color={palette.danger} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.dangerLinkLabel}>Delete account</Text>
                            <Text style={styles.dangerLinkSubtitle}>Permanently delete your account</Text>
                        </View>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={palette.danger} />
                </Pressable>
            </View>

            <Pressable style={styles.dangerButton} onPress={handleSignOut}>
                <IconSymbol name="arrow.right.square.fill" size={20} color={palette.danger} />
                <Text style={styles.dangerLabel}>Sign out</Text>
            </Pressable>
        </View>
    );
}

function SettingsNotificationsPanel() {
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);
    const [orderUpdates, setOrderUpdates] = useState(true);
    const [promotional, setPromotional] = useState(false);

    return (
        <>
            <SettingsSwitchRow
                label="Email notifications"
                subtitle="Receive updates via email"
                value={emailNotifications}
                onValueChange={setEmailNotifications}
            />
            <SettingsSwitchRow
                label="Push notifications"
                subtitle="Receive push notifications on your device"
                value={pushNotifications}
                onValueChange={setPushNotifications}
            />
            <SettingsSwitchRow
                label="SMS notifications"
                subtitle="Receive updates via text message"
                value={smsNotifications}
                onValueChange={setSmsNotifications}
            />
            <SettingsSwitchRow
                label="Order updates"
                subtitle="Get notified about your order status"
                value={orderUpdates}
                onValueChange={setOrderUpdates}
            />
            <SettingsSwitchRow
                label="Promotional emails"
                subtitle="Receive special offers and promotions"
                value={promotional}
                onValueChange={setPromotional}
            />
        </>
    );
}

function SettingsLinkRow({ onPress, label, icon, subtitle }: { onPress: () => void; label: string; icon: IconSymbolName; subtitle?: string }) {
    return (
        <Pressable style={styles.settingsLinkRow} onPress={onPress}>
            <View style={styles.settingsLinkIconContainer}>
                <IconSymbol name={icon} size={18} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.settingsLinkLabel}>{label}</Text>
                {subtitle && <Text style={styles.settingsLinkSubtitle}>{subtitle}</Text>}
            </View>
            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
        </Pressable>
    );
}

function SettingsSwitchRow({ label, subtitle, value, onValueChange }: { label: string; subtitle: string; value: boolean; onValueChange: (value: boolean) => void }) {
    return (
        <View style={styles.settingsSwitchRow}>
            <View style={styles.settingsSwitchLabelContainer}>
                <Text style={styles.settingsSwitchLabel}>{label}</Text>
                <Text style={styles.settingsSwitchDescription}>{subtitle}</Text>
            </View>
            <Pressable
                onPress={() => onValueChange(!value)}
                style={[styles.settingsSwitch, value && styles.settingsSwitchActive]}
            >
                <View style={[styles.settingsSwitchThumb, value && styles.settingsSwitchThumbActive]} />
            </Pressable>
        </View>
    );
}

function RecipientsPanel() {
    const emptyForm: RecipientFormState = {
        firstName: '',
        lastName: '',
        relationship: '',
        email: '',
        phone: '',
        address: '',
        apartment: '',
        city: '',
        state: '',
        country: '',
        zip: '',
        sports: '',
        hobbies: '',
        favoriteColors: '',
        favoriteArtists: '',
        stylePreferences: '',
        favoriteGenres: '',
        personalityLifestyle: '',
        giftTypePreference: '',
        dietaryPreferences: '',
        allergies: '',
        recentLifeEvents: '',
        ageRange: '',
        notes: '',
    };

    const { recipients, loading: recipientsLoading, setRecipients, addRecipient, updateRecipient, deleteRecipient } = useRecipients();
    const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
    const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
    const [form, setForm] = useState<RecipientFormState>(emptyForm);
    const [modalVisible, setModalVisible] = useState(false);
    const [formPage, setFormPage] = useState(0);

    const updateForm = useCallback((patch: Partial<RecipientFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setFormMode(null);
        setActiveRecipientId(null);
        setModalVisible(false);
        setFormPage(0);
    };

    const handleAdd = () => {
        setActiveRecipientId(null);
        setForm(emptyForm);
        setFormMode('add');
        setModalVisible(true);
        setFormPage(0);
    };

    const handleEdit = (recipient: Recipient) => {
        setActiveRecipientId(recipient.id);
        setForm({
            firstName: recipient.firstName,
            lastName: recipient.lastName ?? '',
            relationship: recipient.relationship,
            email: recipient.email ?? '',
            phone: recipient.phone,
            address: recipient.address,
            apartment: recipient.apartment ?? '',
            city: recipient.city,
            state: recipient.state ?? '',
            country: recipient.country,
            zip: recipient.zip,
            sports: recipient.sports ?? '',
            hobbies: recipient.hobbies ?? '',
            favoriteColors: recipient.favoriteColors ?? '',
            favoriteArtists: recipient.favoriteArtists ?? '',
            stylePreferences: recipient.stylePreferences ?? '',
            favoriteGenres: recipient.favoriteGenres ?? '',
            personalityLifestyle: recipient.personalityLifestyle ?? '',
            giftTypePreference: recipient.giftTypePreference ?? '',
            dietaryPreferences: recipient.dietaryPreferences ?? '',
            allergies: recipient.allergies ?? '',
            recentLifeEvents: recipient.recentLifeEvents ?? '',
            ageRange: recipient.ageRange ?? '',
            notes: recipient.notes ?? '',
        });
        setFormMode('edit');
        setModalVisible(true);
        setFormPage(0);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Remove recipient', 'Are you sure you want to remove this recipient?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await deleteRecipient(id);
                    if (error) {
                        Alert.alert('Error', `Failed to delete recipient: ${error.message}`);
                    } else {
                        if (activeRecipientId === id) {
                            resetForm();
                        }
                    }
                },
            },
        ]);
    };

    const handleSave = async () => {
        if (!formMode) {
            return;
        }

        const trimmed: RecipientFormState = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            relationship: form.relationship.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            apartment: form.apartment?.trim() ?? '',
            city: form.city.trim(),
            state: form.state.trim(),
            country: form.country.trim(),
            zip: form.zip.trim(),
            sports: form.sports.trim(),
            hobbies: form.hobbies.trim(),
            favoriteColors: form.favoriteColors.trim(),
            favoriteArtists: form.favoriteArtists.trim(),
            stylePreferences: form.stylePreferences.trim(),
            favoriteGenres: form.favoriteGenres.trim(),
            personalityLifestyle: form.personalityLifestyle.trim(),
            giftTypePreference: form.giftTypePreference.trim(),
            dietaryPreferences: form.dietaryPreferences.trim(),
            allergies: form.allergies.trim(),
            recentLifeEvents: form.recentLifeEvents.trim(),
            ageRange: form.ageRange.trim(),
            notes: form.notes.trim(),
        };

        if (!trimmed.firstName || !trimmed.address || !trimmed.city || !trimmed.country || !trimmed.zip) {
            Alert.alert('Missing details', 'First name, address, city, country, and ZIP are required.');
            return;
        }

        const stateIsRequired = requiresStateField(trimmed.country);
        if (stateIsRequired && !trimmed.state) {
            Alert.alert('Missing details', 'State / province is required for the selected country.');
            return;
        }

        if (!stateIsRequired) {
            trimmed.state = '';
        }

        let error: Error | null = null;
        if (formMode === 'edit' && activeRecipientId) {
            const result = await updateRecipient(activeRecipientId, trimmed);
            error = result.error;
        } else {
            const result = await addRecipient(trimmed);
            error = result.error;
        }

        if (error) {
            Alert.alert('Error', `Failed to save recipient: ${error.message}`);
        } else {
            resetForm();
        }
    };

    const handleCancel = () => {
        resetForm();
    };

    return (
        <View style={styles.sectionGap}>
            <View style={styles.groupCard}>
                <Text style={styles.groupTitle}>Saved recipients</Text>
                <Text style={styles.groupSubtitle}>Add friends and family you frequently send gifts to.</Text>

                <Pressable style={styles.recipientAddButton} onPress={handleAdd} accessibilityRole="button">
                    <IconSymbol name="plus" size={20} color={BRAND_COLOR} />
                    <Text style={styles.recipientAddButtonLabel}>{formMode === 'add' ? 'Adding new recipient' : 'Add new recipient'}</Text>
                </Pressable>

                {recipients.map((recipient) => (
                    <RecipientCard
                        key={recipient.id}
                        firstName={recipient.firstName}
                        lastName={recipient.lastName}
                        relationship={recipient.relationship}
                        email={recipient.email}
                        phone={recipient.phone}
                        address={recipient.address}
                        apartment={recipient.apartment}
                        city={recipient.city}
                        state={recipient.state}
                        country={recipient.country}
                        zip={recipient.zip}
                        sports={recipient.sports}
                        hobbies={recipient.hobbies}
                        favoriteColors={recipient.favoriteColors}
                        favoriteArtists={recipient.favoriteArtists}
                        stylePreferences={recipient.stylePreferences}
                        favoriteGenres={recipient.favoriteGenres}
                        personalityLifestyle={recipient.personalityLifestyle}
                        giftTypePreference={recipient.giftTypePreference}
                        dietaryPreferences={recipient.dietaryPreferences}
                        allergies={recipient.allergies}
                        recentLifeEvents={recipient.recentLifeEvents}
                        ageRange={recipient.ageRange}
                        notes={recipient.notes}
                        onEdit={() => handleEdit(recipient)}
                        onDelete={() => handleDelete(recipient.id)}
                        isEditing={formMode === 'edit' && activeRecipientId === recipient.id}
                    />
                ))}
                {recipients.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No recipients yet</Text>
                        <Text style={styles.emptyStateSubtitle}>Add someone you gift regularly so checkout stays fast.</Text>
                    </View>
                )}
            </View>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCancel}
                presentationStyle="overFullScreen"
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalCardWrapper}
                    >
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>{formMode === 'edit' ? 'Edit recipient' : 'New recipient'}</Text>
                            <View style={styles.modalFormContainer}>
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    contentContainerStyle={styles.modalFormContent}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    {formPage === 0 ? (
                                        <RecipientFormFields form={form} onChange={updateForm} />
                                    ) : (
                                        <RecipientPreferenceFields form={form} onChange={updateForm} />
                                    )}
                                </ScrollView>
                            </View>
                            <View style={styles.modalStepperRow}>
                                {[0, 1].map((index) => (
                                    <View key={index} style={[styles.modalStepDot, index === formPage && styles.modalStepDotActive]} />
                                ))}
                            </View>
                            <View style={styles.modalButtonRow}>
                                <Pressable style={styles.modalSecondaryButton} onPress={handleCancel} accessibilityRole="button">
                                    <Text style={styles.modalSecondaryLabel}>Cancel</Text>
                                </Pressable>
                                {formPage === 0 ? (
                                    <Pressable style={styles.modalPrimaryButton} onPress={() => setFormPage(1)} accessibilityRole="button">
                                        <Text style={styles.modalPrimaryLabel}>Next</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.modalPagerActions}>
                                        <Pressable style={styles.modalSecondaryButton} onPress={() => setFormPage(0)} accessibilityRole="button">
                                            <Text style={styles.modalSecondaryLabel}>Back</Text>
                                        </Pressable>
                                        <Pressable style={styles.modalPrimaryButton} onPress={handleSave} accessibilityRole="button">
                                            <Text style={styles.modalPrimaryLabel}>Save</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

function RecipientFormFields({ form, onChange }: { form: RecipientFormState; onChange: (patch: Partial<RecipientFormState>) => void }) {
    const stateOptions = useMemo(() => getStateOptionsForCountry(form.country), [form.country]);
    const showStateField = stateOptions.length > 0;
    return (
        <View style={styles.formFields}>
            <View style={styles.formRow}>
                <View style={[styles.inputGroup, styles.formColumn]}>
                    <Text style={styles.inputLabel}>First name</Text>
                    <TextInput
                        value={form.firstName}
                        onChangeText={(text) => onChange({ firstName: text })}
                        style={styles.textInput}
                        placeholder="Jordan"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        autoCapitalize="words"
                        returnKeyType="next"
                    />
                </View>
                <View style={[styles.inputGroup, styles.formColumn]}>
                    <Text style={styles.inputLabel}>Last name (optional)</Text>
                    <TextInput
                        value={form.lastName}
                        onChangeText={(text) => onChange({ lastName: text })}
                        style={styles.textInput}
                        placeholder="Miles"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        autoCapitalize="words"
                        returnKeyType="next"
                    />
                </View>
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relationship</Text>
                <TextInput
                    value={form.relationship}
                    onChangeText={(text) => onChange({ relationship: text })}
                    style={styles.textInput}
                    placeholder="e.g. Sister, coworker"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (optional)</Text>
                <TextInput
                    value={form.email}
                    onChangeText={(text) => onChange({ email: text })}
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                    value={form.phone}
                    onChangeText={(text) => onChange({ phone: text })}
                    style={styles.textInput}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Street address</Text>
                <TextInput
                    value={form.address}
                    onChangeText={(text) => onChange({ address: text })}
                    style={styles.textInput}
                    placeholder="238 Market Street"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Apartment / unit (optional)</Text>
                <TextInput
                    value={form.apartment}
                    onChangeText={(text) => onChange({ apartment: text })}
                    style={styles.textInput}
                    placeholder="Apt 5B"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="characters"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={form.country}
                        onValueChange={(value) => onChange({ country: value, state: '' })}
                        style={styles.picker}
                        mode="dropdown"
                        dropdownIconColor={palette.textSecondary}
                    >
                        <Picker.Item label="Select country" value="" color={palette.textSecondary} />
                        {COUNTRY_LIST.map((country) => (
                            <Picker.Item key={country} label={country} value={country} color={palette.textPrimary} />
                        ))}
                    </Picker>
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={[styles.inputGroup, styles.formColumn]}>
                    <Text style={styles.inputLabel}>ZIP / Postal code</Text>
                    <TextInput
                        value={form.zip}
                        onChangeText={(text) => onChange({ zip: text })}
                        style={styles.textInput}
                        placeholder="94107"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        autoCapitalize="characters"
                        returnKeyType={showStateField ? 'next' : 'done'}
                    />
                </View>
                <View style={[styles.inputGroup, styles.formColumn]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                        value={form.city}
                        onChangeText={(text) => onChange({ city: text })}
                        style={styles.textInput}
                        placeholder="San Francisco"
                        placeholderTextColor="rgba(47,35,24,0.4)"
                        autoCapitalize="words"
                        returnKeyType={showStateField ? 'next' : 'done'}
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                {showStateField ? (
                    <View style={[styles.inputGroup, styles.formColumn]}>
                        <Text style={styles.inputLabel}>State / Province</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={form.state}
                                onValueChange={(value) => onChange({ state: value })}
                                style={styles.picker}
                                mode="dropdown"
                                dropdownIconColor={palette.textSecondary}
                            >
                                <Picker.Item label="Select state / province" value="" color={palette.textSecondary} />
                                {stateOptions.map((state) => (
                                    <Picker.Item key={state} label={state} value={state} color={palette.textPrimary} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

function RecipientPreferenceFields({ form, onChange }: { form: RecipientFormState; onChange: (patch: Partial<RecipientFormState>) => void }) {
    return (
        <View style={styles.formFields}>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sports (optional)</Text>
                <TextInput
                    value={form.sports}
                    onChangeText={(text) => onChange({ sports: text })}
                    style={styles.textInput}
                    placeholder="Running, tennis"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hobbies (optional)</Text>
                <TextInput
                    value={form.hobbies}
                    onChangeText={(text) => onChange({ hobbies: text })}
                    style={styles.textInput}
                    placeholder="Photography, hiking"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="sentences"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Favorite colors (optional)</Text>
                <TextInput
                    value={form.favoriteColors}
                    onChangeText={(text) => onChange({ favoriteColors: text })}
                    style={styles.textInput}
                    placeholder="Terracotta, sage"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Favorite artists (optional)</Text>
                <TextInput
                    value={form.favoriteArtists}
                    onChangeText={(text) => onChange({ favoriteArtists: text })}
                    style={styles.textInput}
                    placeholder="Taylor Swift, Norah Jones"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Style preferences (optional)</Text>
                <TextInput
                    value={form.stylePreferences}
                    onChangeText={(text) => onChange({ stylePreferences: text })}
                    style={styles.textInput}
                    placeholder="Minimalist, bold, vintage, modern, bohemian"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Favorite genres (optional)</Text>
                <TextInput
                    value={form.favoriteGenres}
                    onChangeText={(text) => onChange({ favoriteGenres: text })}
                    style={styles.textInput}
                    placeholder="Books, movies, TV shows, music genres"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Personality & lifestyle (optional)</Text>
                <TextInput
                    value={form.personalityLifestyle}
                    onChangeText={(text) => onChange({ personalityLifestyle: text })}
                    style={styles.textInput}
                    placeholder="Introverted, adventurous, homebody, active"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gift type preference (optional)</Text>
                <TextInput
                    value={form.giftTypePreference}
                    onChangeText={(text) => onChange({ giftTypePreference: text })}
                    style={styles.textInput}
                    placeholder="Practical, sentimental, experiential, luxury"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dietary preferences (optional)</Text>
                <TextInput
                    value={form.dietaryPreferences}
                    onChangeText={(text) => onChange({ dietaryPreferences: text })}
                    style={styles.textInput}
                    placeholder="Vegetarian, vegan, gluten-free, foodie"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Allergies & sensitivities (optional)</Text>
                <TextInput
                    value={form.allergies}
                    onChangeText={(text) => onChange({ allergies: text })}
                    style={styles.textInput}
                    placeholder="Food, fragrances, materials"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recent life events (optional)</Text>
                <TextInput
                    value={form.recentLifeEvents}
                    onChangeText={(text) => onChange({ recentLifeEvents: text })}
                    style={styles.textInput}
                    placeholder="New job, moved, had a baby, retired"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="words"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age range (optional)</Text>
                <TextInput
                    value={form.ageRange}
                    onChangeText={(text) => onChange({ ageRange: text })}
                    style={styles.textInput}
                    placeholder="e.g. 25-30, 40s, 60+"
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    autoCapitalize="none"
                    returnKeyType="next"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Anything else? (optional)</Text>
                <TextInput
                    value={form.notes}
                    onChangeText={(text) => onChange({ notes: text })}
                    style={[styles.textInput, styles.textInputMultiline]}
                    placeholder="Additional notes, preferences, or gift ideas..."
                    placeholderTextColor="rgba(47,35,24,0.4)"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
        </View>
    );
}

function RecipientCard({ firstName, lastName, relationship, email, phone, address, apartment, city, state, country, zip, sports, hobbies, favoriteColors, favoriteArtists, stylePreferences, favoriteGenres, personalityLifestyle, giftTypePreference, dietaryPreferences, allergies, recentLifeEvents, ageRange, notes, onEdit, onDelete, isEditing }: RecipientCardProps) {
    return (
        <View style={[styles.recipientCard, isEditing && styles.recipientCardEditing]}>
            <View style={styles.recipientHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.recipientName}>{lastName ? `${firstName} ${lastName}` : firstName}</Text>
                    <Text style={styles.recipientRelationship}>{relationship}</Text>
                </View>
                <View style={styles.recipientActions}>
                    <Pressable style={styles.recipientActionButton} onPress={onEdit} accessibilityRole="button">
                        <IconSymbol name="square.and.pencil" size={20} color={palette.textPrimary} />
                    </Pressable>
                    <Pressable style={[styles.recipientActionButton, styles.recipientDeleteButton]} onPress={onDelete} accessibilityRole="button">
                        <IconSymbol name="trash" size={20} color="#C53030" />
                    </Pressable>
                </View>
            </View>
            {email ? (
                <View style={styles.recipientDetailRow}>
                    <Text style={styles.recipientLabel}>Email</Text>
                    <Text style={styles.recipientValue}>{email}</Text>
                </View>
            ) : null}
            {phone ? (
                <View style={styles.recipientDetailRow}>
                    <Text style={styles.recipientLabel}>Phone</Text>
                    <Text style={styles.recipientValue}>{phone}</Text>
                </View>
            ) : null}
            <View style={styles.recipientDetailRow}>
                <Text style={styles.recipientLabel}>Address</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.recipientValue}>{address}</Text>
                    {apartment ? <Text style={styles.recipientValue}>{apartment}</Text> : null}
                    <Text style={styles.recipientValue}>
                        {city}
                        {state ? `, ${state}` : ''} {zip}
                    </Text>
                    <Text style={styles.recipientValue}>{country}</Text>
                </View>
            </View>
            {(sports || hobbies || favoriteColors || favoriteArtists || stylePreferences || favoriteGenres || personalityLifestyle || giftTypePreference || dietaryPreferences || allergies || recentLifeEvents || ageRange || notes) ? (
                <View style={styles.recipientInsightsBlock}>
                    {sports ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Sports</Text>
                            <Text style={styles.recipientValue}>{sports}</Text>
                        </View>
                    ) : null}
                    {hobbies ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Hobbies</Text>
                            <Text style={styles.recipientValue}>{hobbies}</Text>
                        </View>
                    ) : null}
                    {favoriteColors ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite colors</Text>
                            <Text style={styles.recipientValue}>{favoriteColors}</Text>
                        </View>
                    ) : null}
                    {favoriteArtists ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite artists</Text>
                            <Text style={styles.recipientValue}>{favoriteArtists}</Text>
                        </View>
                    ) : null}
                    {stylePreferences ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Style</Text>
                            <Text style={styles.recipientValue}>{stylePreferences}</Text>
                        </View>
                    ) : null}
                    {favoriteGenres ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Favorite genres</Text>
                            <Text style={styles.recipientValue}>{favoriteGenres}</Text>
                        </View>
                    ) : null}
                    {personalityLifestyle ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Personality & lifestyle</Text>
                            <Text style={styles.recipientValue}>{personalityLifestyle}</Text>
                        </View>
                    ) : null}
                    {giftTypePreference ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Gift preference</Text>
                            <Text style={styles.recipientValue}>{giftTypePreference}</Text>
                        </View>
                    ) : null}
                    {dietaryPreferences ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Dietary preferences</Text>
                            <Text style={styles.recipientValue}>{dietaryPreferences}</Text>
                        </View>
                    ) : null}
                    {allergies ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Allergies</Text>
                            <Text style={styles.recipientValue}>{allergies}</Text>
                        </View>
                    ) : null}
                    {recentLifeEvents ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Recent events</Text>
                            <Text style={styles.recipientValue}>{recentLifeEvents}</Text>
                        </View>
                    ) : null}
                    {ageRange ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Age range</Text>
                            <Text style={styles.recipientValue}>{ageRange}</Text>
                        </View>
                    ) : null}
                    {notes ? (
                        <View style={styles.recipientDetailRow}>
                            <Text style={styles.recipientLabel}>Notes</Text>
                            <Text style={styles.recipientValue}>{notes}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

function QuickAction({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.quickAction}>
                <Text style={styles.quickIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.quickTitle}>{title}</Text>
                    <Text style={styles.quickSubtitle}>{subtitle}</Text>
                </View>
                <Text style={styles.linkChevron}>›</Text>
            </Pressable>
				</Link>
    );
}

function QuickActionButton({ onPress, title, subtitle, icon }: { onPress: () => void; title: string; subtitle: string; icon: IconSymbolName }) {
    return (
        <Pressable style={styles.quickAction} onPress={onPress}>
            <View style={styles.quickIconContainer}>
                <IconSymbol name={icon} size={20} color={BRAND_COLOR} />
			</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>{title}</Text>
                <Text style={styles.quickSubtitle}>{subtitle}</Text>
		</View>
            <IconSymbol name="chevron.right" size={20} color={palette.textSecondary} />
        </Pressable>
    );
}

function ActivityItem({ icon, title, subtitle, color }: { icon: IconSymbolName; title: string; subtitle: string; color: string }) {
    return (
        <View style={styles.activityItem}>
            <View style={[styles.activityIconContainer, { backgroundColor: `${color}15` }]}>
                <IconSymbol name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activitySubtitle}>{subtitle}</Text>
            </View>
        </View>
    );
}

function StatCard({ title, value, trend, accent }: { title: string; value: string; trend: string; accent?: 'alt' }) {
    const isAlt = accent === 'alt';
    return (
        <View style={[styles.statCard, isAlt ? styles.statCardAlt : styles.statCardPrimary]}>
            <Text style={[styles.statValue, isAlt ? styles.statValueAlt : null]}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statTrend}>{trend}</Text>
        </View>
    );
}

function LinkRow({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.linkRow}>
                <Text style={styles.linkLabel}>{label}</Text>
                <Text style={styles.linkChevron}>›</Text>
            </Pressable>
        </Link>
    );
}

function OrderRow({ code, status, eta, href }: { code: string; status: string; eta: string; href: string }) {
    return (
        <Link href={href} asChild>
            <Pressable style={styles.orderRow}>
                <View>
                    <Text style={styles.orderCode}>#{code}</Text>
                    <Text style={styles.orderEta}>{eta}</Text>
                </View>
                <Text style={styles.orderStatus}>{status}</Text>
            </Pressable>
        </Link>
	);
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: palette.background,
    },
    content: {
        padding: 20,
        gap: 18,
    },
    heroCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 24,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        overflow: 'visible',
    },
    heroTopSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    heroMetaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: palette.cardAlt,
        gap: 6,
    },
    heroMetaText: {
        fontSize: 12,
        fontWeight: '600',
        color: palette.textSecondary,
    },
    heroMembershipBadge: {
        backgroundColor: BRAND_COLOR,
        borderWidth: 0,
    },
    heroMembershipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    heroMainContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
    },
    heroAvatarWrapper: {
        position: 'relative',
        width: 88,
        height: 88,
    },
    heroAvatarBubble: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: palette.card,
        zIndex: 2,
    },
    heroAvatarImage: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: palette.card,
        zIndex: 2,
    },
    heroAvatarRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: BRAND_COLOR,
        opacity: 0.2,
        zIndex: 1,
    },
    heroAvatarInitials: {
        fontSize: 32,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    heroInfoContainer: {
        flex: 1,
        gap: 12,
        paddingTop: 4,
    },
    heroFullName: {
        fontSize: 26,
        fontFamily: BRAND_FONT,
        fontWeight: '800',
        color: palette.textPrimary,
        letterSpacing: -0.5,
    },
    heroEmail: {
        fontSize: 14,
        fontWeight: '500',
        color: palette.textSecondary,
        marginTop: -4,
    },
    heroStatsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    heroStatCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.accentSoft,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        flex: 1,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 4,
    },
    heroStatValue: {
        fontSize: 18,
        fontWeight: '800',
        color: BRAND_COLOR,
        fontFamily: BRAND_FONT,
        lineHeight: 22,
    },
    heroStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: palette.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    avatarBubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    avatarImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: palette.border,
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: '800',
        color: palette.textPrimary,
        fontFamily: BRAND_FONT,
    },
    heroHeading: {
        fontSize: 26,
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        textAlign: 'center',
    },
    heroSubheading: {
        color: palette.textSecondary,
        fontSize: 14,
    },
    heroActions: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    primaryButton: {
        backgroundColor: BRAND_COLOR,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 2,
    },
    primaryButtonLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    heroSecondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.cardAlt,
    },
    heroSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    tabBar: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    tabPill: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    tabLabelHidden: {
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        borderWidth: 0,
        overflow: 'hidden',
    },
    sectionGap: {
        gap: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 4,
    },
    statCardPrimary: {
        borderColor: BRAND_COLOR,
        backgroundColor: palette.accentSoft,
    },
    statCardAlt: {
        borderColor: '#C8BED4',
        backgroundColor: '#F4F0F8',
    },
    statValue: {
        fontSize: 28,
        fontFamily: BRAND_FONT,
        color: BRAND_COLOR,
    },
    statValueAlt: {
        color: '#6054B5',
    },
    statTitle: {
        color: palette.textSecondary,
        fontWeight: '700',
    },
    statTrend: {
        color: palette.textPrimary,
        fontSize: 12,
    },
    groupCard: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    groupTitle: {
        fontFamily: BRAND_FONT,
        color: palette.textPrimary,
        fontSize: 18,
    },
    groupSubtitle: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    quickGrid: {
        gap: 10,
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: palette.border,
    },
    quickIcon: {
        fontSize: 20,
    },
    quickIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickTitle: {
        fontWeight: '800',
        color: palette.textPrimary,
        fontSize: 15,
    },
    quickSubtitle: {
        color: palette.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    statCardPressable: {
        flex: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    summaryItem: {
        flex: 1,
        gap: 6,
    },
    summaryLabel: {
        fontSize: 13,
        color: palette.textSecondary,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: palette.textPrimary,
    },
    summaryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    premiumBadge: {
        backgroundColor: palette.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    premiumBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    activityList: {
        gap: 12,
        marginTop: 4,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    activityIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    activitySubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        marginTop: 2,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    linkLabel: {
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    linkChevron: {
        color: palette.textSecondary,
        fontWeight: '800',
        fontSize: 18,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    orderCode: {
        fontWeight: '800',
        color: palette.textPrimary,
    },
    orderEta: {
        color: palette.textSecondary,
        fontSize: 12,
    },
    orderStatus: {
        color: '#2F855A',
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: palette.accentSoft,
    },
    secondaryLabel: {
        color: BRAND_COLOR,
        fontWeight: '800',
    },
    dangerButton: {
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: '#FAE1E1',
        borderWidth: 1,
        borderColor: '#F5B5B5',
    },
    dangerLabel: {
        color: '#C53030',
        fontWeight: '800',
    },
    settingsButton: {
        marginTop: 8,
        borderRadius: 16,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
        overflow: 'hidden',
    },
    settingsButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    settingsButtonTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: palette.textPrimary,
    },
    settingsButtonSubtitle: {
        fontSize: 13,
        color: palette.textSecondary,
        marginTop: 2,
    },
    recipientCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        padding: 16,
        gap: 12,
    },
    recipientCardEditing: {
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 4,
    },
    recipientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    recipientName: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
    },
    recipientRelationship: {
        color: palette.textSecondary,
        fontSize: 13,
    },
    recipientActions: {
        flexDirection: 'row',
        gap: 8,
    },
    recipientActionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.cardAlt,
        borderWidth: 1,
        borderColor: 'rgba(230,222,214,0.7)',
    },
    recipientDeleteButton: {
        backgroundColor: 'rgba(197,48,48,0.08)',
        borderColor: 'rgba(197,48,48,0.25)',
    },
    recipientDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    recipientLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        minWidth: 64,
    },
    recipientValue: {
        color: palette.textPrimary,
        fontSize: 13,
        flexShrink: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 6,
    },
    emptyStateTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 16,
        color: palette.textPrimary,
    },
    emptyStateSubtitle: {
        color: palette.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 12,
    },
    recipientInsightsBlock: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
        gap: 8,
    },
    recipientFormCard: {
        marginTop: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.card,
        padding: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    recipientFormTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 18,
        color: palette.textPrimary,
    },
    recipientAddButton: {
        marginTop: 12,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.accentSoft,
        borderWidth: 1,
        borderColor: BRAND_COLOR,
    },
    recipientAddButtonLabel: {
        color: BRAND_COLOR,
        fontWeight: '700',
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        color: palette.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    textInput: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        backgroundColor: palette.cardAlt,
        paddingVertical: 12,
        paddingHorizontal: 16,
        color: palette.textPrimary,
        fontSize: 14,
    },
    textInputMultiline: {
        minHeight: 96,
    },
    formButtonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    formSecondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        backgroundColor: palette.cardAlt,
    },
    formSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    formPrimaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
    },
    formPrimaryLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalCardWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        height: '80%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    modalTitle: {
        fontFamily: BRAND_FONT,
        fontSize: 22,
        color: palette.textPrimary,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    modalPagerContainer: {
        width: '100%',
        flex: 1,
    },
    modalFormContainer: {
        flex: 1,
    },
    modalFormContent: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 14,
    },
    modalStepperRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    modalStepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(47,35,24,0.25)',
    },
    modalStepDotActive: {
        backgroundColor: BRAND_COLOR,
    },
    modalButtonRow: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(230,222,214,0.65)',
    },
    modalSecondaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        backgroundColor: palette.cardAlt,
    },
    modalSecondaryLabel: {
        color: palette.textPrimary,
        fontWeight: '700',
    },
    modalPrimaryButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        backgroundColor: BRAND_COLOR,
    },
    modalPrimaryLabel: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    modalPagerActions: {
        flexDirection: 'row',
        gap: 12,
        flex: 1,
    },
    formFields: {
        gap: 14,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    formColumn: {
        flex: 1,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 14,
        backgroundColor: palette.cardAlt,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
        color: palette.textPrimary,
    },
    settingsTabBar: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    settingsTabPill: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsTabPillActive: {
        backgroundColor: BRAND_COLOR,
        borderColor: BRAND_COLOR,
        shadowColor: BRAND_COLOR,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 3,
    },
    settingsLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    settingsLinkIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsLinkLabel: {
        flex: 1,
        color: palette.textPrimary,
        fontWeight: '600',
        fontSize: 15,
    },
    settingsLinkSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
    settingsSwitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingsSwitchLabelContainer: {
        flex: 1,
        gap: 4,
    },
    settingsSwitchLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.textPrimary,
    },
    settingsSwitchDescription: {
        fontSize: 12,
        color: palette.textSecondary,
    },
    settingsSwitch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.neutralSoft,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    settingsSwitchActive: {
        backgroundColor: BRAND_COLOR,
    },
    settingsSwitchThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    settingsSwitchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    dangerLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230,222,214,0.65)',
    },
    dangerLinkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dangerLinkLabel: {
        flex: 1,
        color: palette.danger,
        fontWeight: '600',
        fontSize: 15,
    },
    dangerLinkSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        marginTop: 2,
    },
});


