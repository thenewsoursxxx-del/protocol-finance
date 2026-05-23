-- ============================================================================
-- 20260523_fix_reports_rls.sql
--
-- Чинит RLS-политики на public.reports. После перехода на Supabase Auth
-- claim `sub` в JWT стал UUID (auth.users.id) вместо bigint telegram_id.
-- Старые политики, использующие (jwt->>'sub')::bigint, падают с
-- ошибкой 22P02 «invalid input syntax for type bigint: "<uuid>"».
--
-- Решение: переписать политики на claim `telegram_id`, который наш
-- Custom Access Token Hook (миграция 20260523_custom_access_token_hook.sql)
-- кладёт в JWT из user_metadata. Тот же подход, что для public.user_state.
--
-- Идемпотентно — сносит ВСЕ существующие политики и создаёт заново.
-- ============================================================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Сносим все старые политики (включая возможные "Enable insert for ..." остатки).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.reports'::regclass
  LOOP
    EXECUTE format('DROP POLICY %I ON public.reports', pol.polname);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Новые политики: проверка через telegram_id из JWT claim.
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT — юзер видит только свои отчёты
CREATE POLICY "reports: select own"
ON public.reports
FOR SELECT
TO authenticated
USING (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- INSERT — юзер может писать только под своим telegram_id
CREATE POLICY "reports: insert own"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- UPDATE — на случай редактирования (статус и т.д.)
CREATE POLICY "reports: update own"
ON public.reports
FOR UPDATE
TO authenticated
USING (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
)
WITH CHECK (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- Service role — полный доступ для Edge Functions (админ-панель, бот-нотификации)
CREATE POLICY "reports: service_role full access"
ON public.reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- ПРОВЕРКА:
--   SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid='public.reports'::regclass ORDER BY polcmd;
-- Должно быть 5 строк:
--   reports: service_role full access (*)
--   reports: insert own  (a)
--   reports: select own  (r)
--   reports: update own  (w)
-- ============================================================================
