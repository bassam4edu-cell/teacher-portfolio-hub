CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'عام',
  description text,
  achieved_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.achievements FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);