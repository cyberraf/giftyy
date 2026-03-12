-- Enable the required extensions
-- RUN THESE ONCE:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to notify on new order
CREATE OR REPLACE FUNCTION public.notify_on_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the send-push-notification edge function
    -- Replace 'YOUR_SERVICE_ROLE_KEY' with your actual key from Supabase Dashboard
    PERFORM net.http_post(
        url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
        ),
        body := jsonb_build_object(
            'userId', NEW.user_id,
            'title', 'Giftyy: Order Confirmed! 🎁',
            'body', 'Your order (#' || NEW.order_code || ') has been placed successfully.'
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new orders
DROP TRIGGER IF EXISTS tr_notify_on_new_order ON public.orders;
CREATE TRIGGER tr_notify_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_order();


-- Function for Batch Occasion Reminders
CREATE OR REPLACE FUNCTION public.check_upcoming_occasions()
RETURNS void AS $$
DECLARE
    occ RECORD;
    reminder_day INT;
    target_date DATE;
    message TEXT;
BEGIN
    -- Logic: For each user/occasion, check if today is a reminder day
    -- This uses the user_settings.reminder_days_before array we implemented
    
    FOR occ IN 
        SELECT 
            o.id, 
            o.user_id, 
            o.title, 
            o.date, 
            o.recurring,
            s.reminder_days_before,
            p.first_name as recipient_name
        FROM public.occasions o
        JOIN public.user_settings s ON o.user_id = s.user_id
        JOIN public.recipients p ON o.recipient_id = p.id
        WHERE s.occasion_reminders_enabled = true
    LOOP
        FOREACH reminder_day IN ARRAY occ.reminder_days_before
        LOOP
            -- Recurring: compare month/day
            IF occ.recurring THEN
                target_date := (CURRENT_DATE + reminder_day * INTERVAL '1 day')::DATE;
                IF EXTRACT(MONTH FROM occ.date) = EXTRACT(MONTH FROM target_date) AND
                   EXTRACT(DAY FROM occ.date) = EXTRACT(DAY FROM target_date) THEN
                    
                    message := 'Reminder: ' || occ.title || ' for ' || occ.recipient_name || ' is in ' || reminder_day || ' days! 🎈';
                    IF reminder_day = 0 THEN message := 'Today is ' || occ.title || ' for ' || occ.recipient_name || '! 🥳'; END IF;
                    
                    PERFORM net.http_post(
                        url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/send-push-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
                        ),
                        body := jsonb_build_object(
                            'userId', occ.user_id,
                            'title', 'Upcoming Occasion! 🎁',
                            'body', message
                        )
                    );
                END IF;
            ELSE
                -- Non-recurring: direct date comparison
                IF occ.date = (CURRENT_DATE + reminder_day * INTERVAL '1 day')::DATE THEN
                    message := 'Reminder: ' || occ.title || ' for ' || occ.recipient_name || ' is in ' || reminder_day || ' days! 🎈';
                    
                    PERFORM net.http_post(
                        url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/send-push-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
                        ),
                        body := jsonb_build_object(
                            'userId', occ.user_id,
                            'title', 'Upcoming Occasion! 🎁',
                            'body', message
                        )
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
