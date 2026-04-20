-- Trigger that fires notify-recipient edge function when a new order is inserted.
-- Runs as service_role via pg_net so the edge function's service_role auth check passes.
-- Replaces the client-side supabase.functions.invoke('notify-recipient', ...) call
-- in OrdersContext.tsx, which was failing with 403 because it used the buyer's JWT.

CREATE OR REPLACE FUNCTION public.notify_recipient_on_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Always notify the recipient if we have an email to reach them
    IF NEW.recipient_email IS NOT NULL AND NEW.recipient_email <> '' THEN
        PERFORM net.http_post(
            url := 'https://qaftabktuogxisioeeua.supabase.co/functions/v1/notify-recipient',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZnRhYmt0dW9neGlzaW9lZXVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODQxMywiZXhwIjoyMDc4NjQ0NDEzfQ.N_TY31PKPua7lUUt5gxABf6921c87uOL0oAJyGbJ6n0'
            ),
            body := jsonb_build_object(
                'recipientEmail',     NEW.recipient_email,
                'recipientFirstName', NEW.recipient_first_name,
                'recipientLastName',  NEW.recipient_last_name,
                'orderCode',          NEW.order_code,
                'street',             NEW.recipient_street,
                'apartment',          NEW.recipient_apartment,
                'city',               NEW.recipient_city,
                'state',              NEW.recipient_state,
                'zip',                NEW.recipient_zip,
                'country',            NEW.recipient_country,
                'estimatedArrival',   COALESCE(NEW.estimated_delivery_date::text, '3-5 business days'),
                'sendEmail',          true,
                'sendInApp',          true,
                'sendPush',           true
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_recipient_on_new_order ON public.orders;

CREATE TRIGGER tr_notify_recipient_on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_recipient_on_new_order();
