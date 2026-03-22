-- Enable the required extensions
-- RUN THESE ONCE:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to notify on new order
CREATE OR REPLACE FUNCTION public.notify_on_new_order()
RETURNS TRIGGER AS $$
DECLARE
    order_updates BOOLEAN;
BEGIN
    -- Check if user has order updates enabled
    SELECT COALESCE(s.order_updates_enabled, true) INTO order_updates
    FROM public.user_settings s
    WHERE s.user_id = NEW.user_id;

    -- Default to true if no settings row exists
    IF order_updates IS NULL THEN
        order_updates := true;
    END IF;

    IF NOT order_updates THEN
        RETURN NEW;
    END IF;

    -- 1. Insert into in-app notifications
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user_id,
        'order_confirmed',
        'Order Confirmed! 🎁',
        'Your order (#' || NEW.order_code || ') has been placed successfully.',
        jsonb_build_object('orderId', NEW.id, 'orderCode', NEW.order_code, 'type', 'order_status')
    );

    -- 2. Call the send-push-notification edge function
    -- (push preference is also checked inside the edge function itself)
    PERFORM net.http_post(
        url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
        ),
        body := jsonb_build_object(
            'userId', NEW.user_id,
            'title', 'Giftyy: Order Confirmed! 🎁',
            'body', 'Your order (#' || NEW.order_code || ') has been placed successfully.',
            'categoryId', 'order_status',
            'data', jsonb_build_object('orderId', NEW.id, 'orderCode', NEW.order_code, 'type', 'order_status')
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


-- Function to notify on order status update
CREATE OR REPLACE FUNCTION public.notify_on_order_status_update()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_body TEXT;
    do_notify BOOLEAN := false;
    order_updates BOOLEAN;
BEGIN
    -- Only notify on specific status changes that are meaningful to the user
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        IF NEW.status = 'confirmed' THEN
            notification_title := 'Order Confirmed! 🎁';
            notification_body := 'Your order (#' || NEW.order_code || ') has been confirmed and is being processed.';
            do_notify := true;
        ELSIF NEW.status = 'shipped' THEN
            notification_title := 'Order Shipped! 🚚';
            notification_body := 'Great news! Your order (#' || NEW.order_code || ') is on its way.';
            do_notify := true;
        ELSIF NEW.status = 'delivered' THEN
            notification_title := 'Order Delivered! 🥳';
            notification_body := 'Your order (#' || NEW.order_code || ') has been delivered. Enjoy!';
            do_notify := true;
        ELSIF NEW.status = 'out_for_delivery' THEN
            notification_title := 'Out for Delivery! 📦';
            notification_body := 'Your order (#' || NEW.order_code || ') is out for delivery and will arrive soon.';
            do_notify := true;
        END IF;
    END IF;

    IF do_notify THEN
        -- Check if user has order updates enabled
        SELECT COALESCE(s.order_updates_enabled, true) INTO order_updates
        FROM public.user_settings s
        WHERE s.user_id = NEW.user_id;

        -- Default to true if no settings row exists
        IF order_updates IS NULL THEN
            order_updates := true;
        END IF;

        IF NOT order_updates THEN
            RETURN NEW;
        END IF;

        -- 1. Insert into in-app notifications
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
            NEW.user_id,
            'order_status_update',
            notification_title,
            notification_body,
            jsonb_build_object('orderId', NEW.id, 'orderCode', NEW.order_code, 'status', NEW.status, 'type', 'order_status')
        );

        -- 2. Call push notification edge function
        -- (push preference is also checked inside the edge function itself)
        PERFORM net.http_post(
            url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/send-push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
            ),
            body := jsonb_build_object(
                'userId', NEW.user_id,
                'title', 'Giftyy: ' || notification_title,
                'body', notification_body,
                'categoryId', 'order_status',
                'data', jsonb_build_object('orderId', NEW.id, 'orderCode', NEW.order_code, 'status', NEW.status, 'type', 'order_status')
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for order updates
DROP TRIGGER IF EXISTS tr_notify_on_order_status_update ON public.orders;
CREATE TRIGGER tr_notify_on_order_status_update
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_status_update();


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
                            'body', message,
                            'categoryId', 'occasion_reminder',
                            'data', jsonb_build_object('type', 'occasion_reminder', 'occasionId', occ.id)
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
                            'body', message,
                            'categoryId', 'occasion_reminder',
                            'data', jsonb_build_object('type', 'occasion_reminder', 'occasionId', occ.id)
                        )
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
