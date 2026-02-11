-- Create global_vendor_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS global_vendor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE global_vendor_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (they're global)
CREATE POLICY "Anyone can read global vendor settings"
    ON global_vendor_settings
    FOR SELECT
    USING (true);

-- Only authenticated users with admin role can modify
CREATE POLICY "Only admins can modify global vendor settings"
    ON global_vendor_settings
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Insert default Giftyy card price if it doesn't exist
INSERT INTO global_vendor_settings (key, value, description)
VALUES ('giftyy_card_price', '3.00', 'Price for Giftyy Card (physical QR code card)')
ON CONFLICT (key) DO NOTHING;

-- You can update the price by running:
-- UPDATE global_vendor_settings SET value = '3.00' WHERE key = 'giftyy_card_price';
