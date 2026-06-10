
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enhance audits table: add url + pre-computed score columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER,
  ADD COLUMN IF NOT EXISTS serp_score INTEGER,
  ADD COLUMN IF NOT EXISTS aeo_score INTEGER,
  ADD COLUMN IF NOT EXISTS humanization_score INTEGER,
  ADD COLUMN IF NOT EXISTS overall_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_audits_overall_score ON public.audits(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_audits_url ON public.audits(url);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. action_items — AI-generated, per-audit action plan items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_items (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id    UUID REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  effort_hours NUMERIC(4,1),
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own action items"
  ON public.action_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own action items"
  ON public.action_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own action items"
  ON public.action_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own action items"
  ON public.action_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_action_items_audit_id  ON public.action_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_id   ON public.action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status    ON public.action_items(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. keywords — keyword tracking targets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.keywords (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,
  url             TEXT,
  target_position INTEGER,
  alert_threshold INTEGER DEFAULT 60,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own keywords"
  ON public.keywords FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON public.keywords(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. keyword_history — score snapshots over time
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.keyword_history (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id  UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  overall_score INTEGER,
  seo_score   INTEGER,
  density     NUMERIC(5,2),
  checked_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view keyword history via keyword ownership"
  ON public.keyword_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.keywords k WHERE k.id = keyword_id AND k.user_id = auth.uid()));

CREATE POLICY "Users can insert keyword history via keyword ownership"
  ON public.keyword_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.keywords k WHERE k.id = keyword_id AND k.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_keyword_history_keyword_id ON public.keyword_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_history_checked_at ON public.keyword_history(checked_at DESC);
