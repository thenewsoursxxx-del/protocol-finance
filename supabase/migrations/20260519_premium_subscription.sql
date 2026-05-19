-- ============================================================================
-- PREMIUM SUBSCRIPTION (Telegram Stars 150⭐ / 30 days)
-- ----------------------------------------------------------------------------
-- Расширяет таблицу users тремя полями для управления подписочной моделью:
--   premium_until        — дата окончания подписки (timestamptz, nullable)
--   auto_renew           — флаг автопродления (boolean, default false)
--   renewal_reminder_at  — когда был отправлен последний reminder за 3 дня
--                          до окончания (используется для дедупликации;
--                          сбрасывается в NULL при каждой новой оплате)
--
-- Все три поля идемпотентны: ADD COLUMN IF NOT EXISTS — безопасно
-- применить повторно. Если premium_until и auto_renew уже добавлены
-- предыдущей миграцией — этот скрипт просто добавит renewal_reminder_at.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS premium_until             timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew                boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_reminder_at       timestamptz,
  -- SUBSCRIPTION MODEL v2: трекинг "грустного" сообщения об окончании
  -- подписки (отправляется один раз, сразу после истечения premium_until).
  -- Дедуплицирует пуш, чтобы пользователь не получал «Premium закончился»
  -- при каждом открытии mini app.
  ADD COLUMN IF NOT EXISTS premium_expired_notice_at timestamptz;

-- Индекс для быстрого поиска юзеров, у которых подписка скоро истекает
-- (используется планируемой pg_cron job'ой server-side и в нашем
-- send-renewal-reminder Edge Function'е).
CREATE INDEX IF NOT EXISTS users_premium_until_idx
  ON public.users (premium_until)
  WHERE premium_until IS NOT NULL;

-- ============================================================================
-- ОПЦИОНАЛЬНО: pg_cron для серверной деактивации просроченных подписок.
-- ----------------------------------------------------------------------------
-- Не обязательно — клиент сам обнуляет is_premium при следующем открытии
-- приложения (см. syncUserAccessFlagsFromDB в app.js). Но если ты хочешь
-- надёжный server-side scheduled cleanup для пользователей, которые
-- не открывают app, раскомментируй ниже:
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--   SELECT cron.schedule(
--     'deactivate-expired-premium',
--     '0 * * * *',  -- каждый час
--     $$ UPDATE public.users
--          SET is_premium = false
--          WHERE is_premium = true
--            AND premium_until IS NOT NULL
--            AND premium_until < now(); $$
--   );
-- ============================================================================
