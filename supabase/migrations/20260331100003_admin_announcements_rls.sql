-- Allow admin users full access to announcements table
-- The existing policies only allow SELECT of published announcements for authenticated users,
-- which blocks admin CRUD operations (create draft, update, delete).

CREATE POLICY "Admins have full access to announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
