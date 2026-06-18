-- ═══════════════════════════════════════════════════════════════════════════
-- ContentIQ — Full Schema (run this once on a fresh Supabase project)
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. audits
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audits (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_keyword      TEXT,
  content_preview     TEXT,
  results             JSONB,
  url                 TEXT,
  seo_score           INTEGER,
  serp_score          INTEGER,
  aeo_score           INTEGER,
  humanization_score  INTEGER,
  overall_score       INTEGER
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own audits"
  ON public.audits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audits_user_id      ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_overall_score ON public.audits(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_audits_url           ON public.audits(url);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. scheduled_content  (Content Calendar)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_content (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_date  DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'planned',
  color           TEXT
);

ALTER TABLE public.scheduled_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled content"
  ON public.scheduled_content FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_user_id ON public.scheduled_content(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_date    ON public.scheduled_content(scheduled_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. action_items  (AI Action Plan)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audit_id     UUID REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('critical','high','medium','low')),
  effort_hours NUMERIC(4,1),
  category     TEXT,
  status       TEXT NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo','in_progress','done'))
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

CREATE INDEX IF NOT EXISTS idx_action_items_audit_id ON public.action_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_id  ON public.action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status   ON public.action_items(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. keywords  (Keyword Tracking)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.keywords (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword          TEXT NOT NULL,
  url              TEXT,
  target_position  INTEGER,
  alert_threshold  INTEGER DEFAULT 60
);

ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own keywords"
  ON public.keywords FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON public.keywords(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. keyword_history  (Score Snapshots)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.keyword_history (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id    UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  overall_score INTEGER,
  seo_score     INTEGER,
  density       NUMERIC(5,2),
  checked_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view keyword history via keyword ownership"
  ON public.keyword_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.keywords k
    WHERE k.id = keyword_id AND k.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert keyword history via keyword ownership"
  ON public.keyword_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.keywords k
    WHERE k.id = keyword_id AND k.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_keyword_history_keyword_id ON public.keyword_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_history_checked_at ON public.keyword_history(checked_at DESC);
