-- ============================================================================
-- COMMUNITY STATS — лог платежей Telegram Stars + новые пользователи
-- ----------------------------------------------------------------------------
-- Цель: дать админам видимую статистику по доходу и росту в блоке
-- «Статистика сообщества» (Профиль). Конкретно:
--   • Заработано Stars всего            ← SUM(amount) FROM stars_payments
--   • Заработано Stars за последний месяц ← SUM(amount) WHERE created_at > now() - 30d
--   • Количество покупок Premium         ← COUNT(*) FROM stars_payments
--   • Новых пользователей за 30 дней     ← COUNT(*) FROM users WHERE created_at > now() - 30d
--
-- Логирование платежей идёт через Edge Function stars-payment-webhook на
-- каждый successful_payment (первичная оплата ИЛИ recurring продление).
-- Идемпотентность гарантируется UNIQUE INDEX по telegram_charge_id —
-- если Telegram повторно доставит тот же платёж, второй INSERT упадёт
-- с conflict (webhook ловит ошибку и не падает).
-- ============================================================================

-- 1) Убеждаемся, что у users есть created_at (Supabase обычно создаёт сам,
--    но для свежих миграций / ручного создания таблицы — на всякий случай).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 2) Индекс на users.created_at — нужен для запроса «новых за 30 дней».
CREATE INDEX IF NOT EXISTS users_created_at_idx
  ON public.users (created_at);

-- 3) Сама таблица платежей.
CREATE TABLE IF NOT EXISTS public.stars_payments (
  id                  BIGSERIAL PRIMARY KEY,
  telegram_id         BIGINT       NOT NULL,
  amount              INTEGER      NOT NULL,           -- цена в Stars (XTR)
  is_recurring        BOOLEAN      NOT NULL DEFAULT false,
  telegram_charge_id  TEXT,                            -- идемпотентность
  invoice_payload     TEXT,                            -- premium_<tg>_<ms>_<flag>
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4) UNIQUE индекс по telegram_charge_id — защита от дублей при повторных
--    доставках webhook'а. Partial-индекс (WHERE charge_id IS NOT NULL)
--    допускает строки без charge_id (например, manual-инсерты).
CREATE UNIQUE INDEX IF NOT EXISTS stars_payments_charge_id_uidx
  ON public.stars_payments (telegram_charge_id)
  WHERE telegram_charge_id IS NOT NULL;

-- 5) Индекс на created_at — нужен для SUM/COUNT по «последнему месяцу».
CREATE INDEX IF NOT EXISTS stars_payments_created_at_idx
  ON public.stars_payments (created_at);

-- 6) Индекс на telegram_id — пригодится для будущих экранов «история оплат юзера».
CREATE INDEX IF NOT EXISTS stars_payments_telegram_id_idx
  ON public.stars_payments (telegram_id);
