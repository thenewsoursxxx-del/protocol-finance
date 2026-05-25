-- REMINDERS: лог отправленных напоминаний + RPC для сброса.
--
-- Логика:
--   • Edge Function send-reminder перед каждой отправкой делает INSERT
--     в reminder_log. UNIQUE-индекс на (telegram_id, type, period_key)
--     гарантирует, что одно и то же напоминание не уйдёт дважды.
--   • period_key уникально идентифицирует "повод":
--       - 'dep_simple:2026-05-15'      → 30-дневный цикл от последнего
--                                          пополнения / даты старта плана
--       - 'dep_cf_period:2026-05-01'   → конкретный период в cashflow
--                                          weekly/biweekly/monthly режиме
--       - 'dep_cf_custom:2026-W21'     → недельный nudge в custom-режиме
--       - 'debt_agg:2026-05-25'        → агрегированное напоминание о долгах
--                                          (одно в день)
--   • При сбросе плана клиент вызывает clear_user_reminder_log(telegram_id) —
--     чтобы после "Начать сначала" напоминания снова срабатывали.
--
-- DEPLOY:
--   Supabase Dashboard → SQL Editor → выполнить весь файл.

-- ── 1. Таблица reminder_log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id           bigserial PRIMARY KEY,
  telegram_id  bigint NOT NULL,
  type         text NOT NULL,
  period_key   text NOT NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  meta         jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS reminder_log_dedup_idx
  ON public.reminder_log (telegram_id, type, period_key);

CREATE INDEX IF NOT EXISTS reminder_log_user_recent_idx
  ON public.reminder_log (telegram_id, sent_at DESC);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_log: service_role full access" ON public.reminder_log;
CREATE POLICY "reminder_log: service_role full access"
  ON public.reminder_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. RPC: clear_user_reminder_log ────────────────────────────────────────
-- Вызывается из клиента (через supabase.rpc) при "Начать сначала".
-- Авторизация: пользователь может стирать только СВОЙ лог (matching telegram_id
-- из JWT custom claim). Service role обходит проверку.

CREATE OR REPLACE FUNCTION public.clear_user_reminder_log(p_telegram_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_telegram_id bigint;
  deleted_count int;
BEGIN
  -- Проверяем, что вызывающий пользователь имеет право стирать этот лог.
  -- service_role обходит этот блок (claim будет NULL, но мы разрешаем).
  IF current_setting('role', true) <> 'service_role' THEN
    BEGIN
      claim_telegram_id := (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint;
    EXCEPTION WHEN OTHERS THEN
      claim_telegram_id := NULL;
    END;

    IF claim_telegram_id IS NULL OR claim_telegram_id <> p_telegram_id THEN
      RAISE EXCEPTION 'unauthorized: telegram_id mismatch';
    END IF;
  END IF;

  DELETE FROM public.reminder_log
   WHERE telegram_id = p_telegram_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_user_reminder_log(bigint) TO authenticated, service_role;

-- ── 3. (Документация) Включение pg_cron + pg_net ───────────────────────────
-- Эти extensions нужны для автоматического вызова Edge Function каждый час.
-- На Supabase они уже доступны, но требуется активировать.
--
-- Раскомментируй ОДНУ строку ниже если хочешь активировать здесь же.
-- Альтернативно: Dashboard → Database → Extensions → найти pg_cron и pg_net →
-- Enable.
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 4. Cron-job (НЕ создаётся автоматически) ───────────────────────────────
-- После того как pg_cron и pg_net включены, выполни ОТДЕЛЬНО в SQL Editor
-- следующий блок, подставив свой SUPABASE_URL и service_role_key:
--
-- SELECT cron.schedule(
--   'send-reminder-hourly',
--   '0 * * * *',                                    -- каждый час в :00
--   $cmd$
--   SELECT net.http_post(
--     url := 'https://cztfcseyzezincbwotvt.supabase.co/functions/v1/send-reminder',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $cmd$
-- );
--
-- Чтобы посмотреть список расписаний:  SELECT * FROM cron.job;
-- Чтобы остановить:                    SELECT cron.unschedule('send-reminder-hourly');
