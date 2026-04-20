-- Allow admins to read all announcement interactions for analytics
CREATE POLICY "Admins can read all interactions"
  ON public.announcement_interactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to read all notifications for announcement stats
CREATE POLICY "Admins can read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
