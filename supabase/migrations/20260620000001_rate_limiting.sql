-- Rate limiting migration
-- Adds a daily audit count view and a function to check if a user is within limits.

CREATE OR REPLACE VIEW public.user_daily_audit_counts AS
SELECT
  user_id,
  COUNT(*) as audit_count,
  DATE(created_at) as audit_date
FROM public.audits
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id, DATE(created_at);

CREATE OR REPLACE FUNCTION public.check_audit_limit(p_user_id UUID, p_max_audits INTEGER DEFAULT 50)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(audit_count), 0) INTO v_count
  FROM public.user_daily_audit_counts
  WHERE user_id = p_user_id;
  RETURN v_count < p_max_audits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
