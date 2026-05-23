-- ============================================================================
-- 20260523_fix_user_state_rls.sql
--
-- Чинит RLS-политики на public.user_state. После включения RLS клиент падает
-- с ошибкой 42501 «new row violates row-level security policy» при попытке
-- saveAppState (INSERT/UPDATE).
--
-- Корень: у user_state либо отсутствуют политики для INSERT/UPDATE,
-- либо они проверяют не тот claim. Здесь идемпотентно пересоздаём весь
-- набор политик на основе telegram_id из JWT (тот же подход, что и для
-- public.users).
--
-- Безопасно гонять повторно — все политики дропаются и создаются заново.
-- ============================================================================

-- На всякий случай убеждаемся, что RLS включена.
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Сносим ВСЕ возможные старые политики, включая «Enable read/insert for now»
-- и шаблонные имена, которые мог создать Dashboard.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.user_state'::regclass
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_state', pol.polname);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Новые политики: пользователь видит/меняет ТОЛЬКО свою строку.
-- Идентификация через telegram_id из JWT claims (auth-telegram Edge Function
-- кладёт claim "telegram_id" в payload).
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT
CREATE POLICY "user_state: select own"
ON public.user_state
FOR SELECT
TO authenticated
USING (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- INSERT — для первого сохранения состояния новым юзером
CREATE POLICY "user_state: insert own"
ON public.user_state
FOR INSERT
TO authenticated
WITH CHECK (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- UPDATE — последующие сохранения
CREATE POLICY "user_state: update own"
ON public.user_state
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

-- DELETE — на случай очистки данных пользователем
CREATE POLICY "user_state: delete own"
ON public.user_state
FOR DELETE
TO authenticated
USING (
  telegram_id = (
    current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )::bigint
);

-- ============================================================================
-- ПРОВЕРКА (запустить после применения):
--
--   SELECT polname, polcmd
--   FROM pg_policy
--   WHERE polrelid = 'public.user_state'::regclass;
--
-- Должно вернуть 4 строки: select own / insert own / update own / delete own
-- ============================================================================
