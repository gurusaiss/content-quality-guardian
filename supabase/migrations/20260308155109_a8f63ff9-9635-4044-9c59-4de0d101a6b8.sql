
CREATE TABLE public.scheduled_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'published', 'cancelled')),
  color text DEFAULT 'blue',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled content" ON public.scheduled_content FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scheduled content" ON public.scheduled_content FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheduled content" ON public.scheduled_content FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheduled content" ON public.scheduled_content FOR DELETE TO authenticated USING (auth.uid() = user_id);
