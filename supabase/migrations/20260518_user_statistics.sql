-- STATISTICS COLLECTION — расширяем таблицу users для трекинга геолокации и премиума.
-- Все колонки nullable / с default — старые строки не сломаются, миграция идемпотентна.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_premium boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS country    text,
  ADD COLUMN IF NOT EXISTS city       text,
  ADD COLUMN IF NOT EXISTS last_ip    text,
  ADD COLUMN IF NOT EXISTS last_visit timestamptz  DEFAULT now();

-- Индекс для быстрого подсчёта премиум/не-премиум пользователей.
CREATE INDEX IF NOT EXISTS users_is_premium_idx ON public.users (is_premium);

-- Индекс для аналитики по странам.
CREATE INDEX IF NOT EXISTS users_country_idx    ON public.users (country);
