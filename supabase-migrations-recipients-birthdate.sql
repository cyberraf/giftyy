-- Supabase migration: Add birth date field to recipients
-- Stores date-of-birth as a DATE column (optional)

ALTER TABLE public.recipients
  ADD COLUMN IF NOT EXISTS birth_date DATE;

DO $$
BEGIN
  -- If older day/month/year columns exist, backfill birth_date and then remove them.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipients' AND column_name = 'birth_day'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipients' AND column_name = 'birth_month'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipients' AND column_name = 'birth_year'
  ) THEN
    UPDATE public.recipients
    SET birth_date = make_date(birth_year, birth_month, birth_day)
    WHERE birth_date IS NULL
      AND birth_year BETWEEN 1900 AND 2100
      AND birth_month BETWEEN 1 AND 12
      AND birth_day BETWEEN 1 AND 31;

    ALTER TABLE public.recipients
      DROP CONSTRAINT IF EXISTS recipients_birth_day_range,
      DROP CONSTRAINT IF EXISTS recipients_birth_month_range,
      DROP CONSTRAINT IF EXISTS recipients_birth_year_range;

    ALTER TABLE public.recipients
      DROP COLUMN IF EXISTS birth_day,
      DROP COLUMN IF EXISTS birth_month,
      DROP COLUMN IF EXISTS birth_year;
  END IF;
END
$$;

COMMENT ON COLUMN public.recipients.birth_date IS 'Recipient birth date (DATE)';

