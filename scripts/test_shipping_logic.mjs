import { createClient } from '@supabase/supabase-js';

// Mock CartItem
const items = [
    {
        id: 'item1',
        productId: 'prod1',
        name: 'Test Product',
        price: '$10.00',
        quantity: 1,
        vendorId: '2d72babb-b3ae-434f-b89d-4febf89659f3' // RAAY Store
    }
];

const supabase = createClient(
    'https://qaftabktuogxisioeeua.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg0MTMsImV4cCI6MjA3ODY0NDQxM30.Q7wDLbMAE9Ugc57EnncnB-dKvveLQgG4HH6SQ5zx4LI'
);

// Copy from shipping-utils.ts (simplified for Node)
const US_STATE_MAP = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'District of Columbia',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
    'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
    'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
    'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon',
    'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota',
    'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia',
    'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

const COUNTRY_MAP = {
    'US': 'United States',
    'USA': 'United States',
    'UNITED STATES OF AMERICA': 'United States'
};

function normalizeState(state) {
    if (!state) return '';
    const s = state.trim().toUpperCase();
    if (US_STATE_MAP[s]) return US_STATE_MAP[s];
    const fullName = Object.values(US_STATE_MAP).find(name => name.toUpperCase() === s);
    return fullName || state.trim();
}

function normalizeCountry(country) {
    if (!country) return 'United States';
    const c = country.trim().toUpperCase();
    if (COUNTRY_MAP[c]) return COUNTRY_MAP[c];
    return country.trim();
}

async function calculateVendorShippingByZone(
    items,
    recipientState,
    recipientCountry = 'United States'
) {
    const normalizedCountry = normalizeCountry(recipientCountry);
    const normalizedState = normalizeState(recipientState);

    console.log(`Simulating for: ${normalizedState}, ${normalizedCountry}`);

    const breakdown = [];
    let hasShippingError = false;

    for (const item of items) {
        const vendorId = item.vendorId;
        const { data: zones } = await supabase
            .from('vendor_shipping_zones')
            .select('*')
            .eq('vendor_id', vendorId);

        let matchedZone = null;
        for (const zone of zones) {
            const countries = zone.countries || [];
            if (countries.length === 0 || countries.includes(normalizedCountry)) {
                if (normalizedCountry === 'United States' && Array.isArray(zone.us_states) && zone.us_states.length > 0) {
                    if (!zone.us_states.includes(normalizedState)) {
                        continue;
                    }
                }
                matchedZone = zone;
                break;
            }
        }

        if (!matchedZone) {
            hasShippingError = true;
            breakdown.push({ vendorId, doesNotShip: true });
        } else {
            breakdown.push({ vendorId, doesNotShip: false, zone: matchedZone.name });
        }
    }

    return { hasShippingError, breakdown };
}

async function runTest() {
    console.log('--- TEST 1: Najib in Pennsylvania (Should PASS) ---');
    const res1 = await calculateVendorShippingByZone(items, 'Pennsylvania', 'United States');
    console.log('Result 1:', JSON.stringify(res1, null, 2));

    console.log('--- TEST 2: Najib in Alabama (Should FAIL) ---');
    const res2 = await calculateVendorShippingByZone(items, 'Alabama', 'United States');
    console.log('Result 2:', JSON.stringify(res2, null, 2));
}

runTest();
