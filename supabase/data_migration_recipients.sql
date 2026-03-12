-- Migration: Move legacy recipients to Global Profiles & Connections
-- CAUTION: Run this after recipient_profiles_connections.sql

DO $$
DECLARE
    rec RECORD;
    new_profile_id UUID;
BEGIN
    FOR rec IN SELECT * FROM public.recipients LOOP
        
        -- 1. Find or Create Global Profile
        SELECT id INTO new_profile_id 
        FROM public.recipient_profiles 
        WHERE phone = rec.phone 
           OR (email IS NOT NULL AND email = rec.email)
        LIMIT 1;

        IF new_profile_id IS NULL THEN
            INSERT INTO public.recipient_profiles (
                full_name, phone, email, avatar_url, 
                address, apartment, city, state, country, zip,
                is_claimed
            ) VALUES (
                rec.first_name || ' ' || COALESCE(rec.last_name, ''),
                rec.phone,
                rec.email,
                NULL, -- avatar_url
                rec.address, rec.apartment, rec.city, rec.state, rec.country, rec.zip,
                false
            ) RETURNING id INTO new_profile_id;
        END IF;

        -- 2. Create Connection
        INSERT INTO public.connections (
            sender_id,
            recipient_profile_id,
            nickname,
            relationship,
            status
        ) VALUES (
            rec.user_id,
            new_profile_id,
            rec.first_name,
            rec.relationship,
            'approved' -- Existing recipients are pre-approved
        ) ON CONFLICT (sender_id, recipient_profile_id) DO NOTHING;

        -- 3. Update Related Data: Preferences
        UPDATE public.recipient_preferences
        SET recipient_profile_id = new_profile_id
        WHERE recipient_id = rec.id;

        -- 4. Update Related Data: Occasions
        UPDATE public.occasions
        SET recipient_profile_id = new_profile_id
        WHERE recipient_id = rec.id;

        -- 5. Update Related Data: AI Recommendations
        UPDATE public.gift_recommendations
        SET recipient_profile_id = new_profile_id
        WHERE recipient_id = rec.id;

        -- 6. Update Related Data: AI Feedback
        UPDATE public.ai_feedback
        SET recipient_profile_id = new_profile_id
        WHERE recipient_id = rec.id;

    END LOOP;
END $$;

-- Optional: After verifying data, you can drop or rename legacy columns
-- ALTER TABLE occasions DROP COLUMN recipient_id;
-- ALTER TABLE recipient_preferences DROP COLUMN recipient_id;
-- DROP TABLE recipients;
