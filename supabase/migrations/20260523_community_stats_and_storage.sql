-- ============================================================================
-- 20260523_community_stats_and_storage.sql
--
-- Восстанавливает функционал, который сломался после включения RLS:
--   1. get_community_stats() — SECURITY DEFINER функция для агрегатной
--      статистики (premiumCount, freeCount, starsEarnedTotal и т.д.).
--      По обычной RLS пользователь видит только свою строку, поэтому
--      count(*) даёт 0/1 вместо реального числа. SECURITY DEFINER функция
--      выполняется от имени владельца таблицы и обходит RLS — при этом
--      возвращает ТОЛЬКО агрегаты (никаких PII).
--
--   2. Storage policies для бакета report-media — разрешают
--      authenticated-пользователям загружать файлы в свою папку
--      reports/<telegram_id>/..., а всем читать (бакет публичный).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AGGREGATE COMMUNITY STATS
-- ─────────────────────────────────────────────────────────────────────────────
-- Возвращает JSON со всеми полями, которые ожидает getCommunityStats()
-- на клиенте. Один RPC-вызов вместо 6 запросов.
--
-- Безопасность: SECURITY DEFINER + явный search_path = public защищает
-- от подмены search_path (search_path injection). Функция читает только
-- агрегаты (count/sum) — PII не утекает.

CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium_count        bigint;
  v_free_count           bigint;
  v_total                bigint;
  v_new_users_30d        bigint;
  v_stars_total          bigint;
  v_stars_last_month     bigint;
  v_premium_purchases    bigint;
  v_since_30d            timestamptz := now() - interval '30 days';
BEGIN
  -- users counters
  SELECT
    count(*) FILTER (WHERE is_premium = true),
    count(*) FILTER (WHERE is_premium IS NOT TRUE),
    count(*),
    count(*) FILTER (WHERE created_at > v_since_30d)
  INTO v_premium_count, v_free_count, v_total, v_new_users_30d
  FROM public.users;

  -- stars_payments counters (таблица может ещё не существовать
  -- в старых проектах — оборачиваем в EXCEPTION)
  BEGIN
    SELECT
      COALESCE(sum(amount), 0)::bigint,
      COALESCE(sum(amount) FILTER (WHERE created_at > v_since_30d), 0)::bigint,
      count(*)::bigint
    INTO v_stars_total, v_stars_last_month, v_premium_purchases
    FROM public.stars_payments;
  EXCEPTION WHEN undefined_table THEN
    v_stars_total       := NULL;
    v_stars_last_month  := NULL;
    v_premium_purchases := NULL;
  END;

  RETURN json_build_object(
    'premiumCount',         v_premium_count,
    'freeCount',            v_free_count,
    'total',                v_total,
    'newUsers30d',          v_new_users_30d,
    'starsEarnedTotal',     v_stars_total,
    'starsEarnedLastMonth', v_stars_last_month,
    'premiumPurchases',     v_premium_purchases
  );
END;
$$;

-- Доступ: любой аутентифицированный пользователь может вызвать RPC.
-- (anon тоже, на случай первого вызова до завершения auth-flow.)
REVOKE ALL ON FUNCTION public.get_community_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_stats() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. STORAGE POLICIES для бакета report-media
-- ─────────────────────────────────────────────────────────────────────────────
-- Структура пути в бакете (см. saveReport в supabase.js):
--   reports/<telegram_id>/<timestamp>/<idx>_<filename>
--
-- Политики:
--   • INSERT: authenticated может писать только в reports/<свой telegram_id>/
--   • SELECT: anon + authenticated могут читать всё (бакет публичный —
--     ссылки на media отдаются в админ-панели/в TG)
--   • UPDATE/DELETE: только в свою папку (на случай повторной загрузки)

-- Создать бакет, если его ещё нет (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-media', 'report-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Сносим старые политики (если были) — переcоздаём с нуля, чтобы избежать
-- конфликта с возможными "Enable insert for all" остатками.
DROP POLICY IF EXISTS "report-media: anyone can read"     ON storage.objects;
DROP POLICY IF EXISTS "report-media: user can upload own" ON storage.objects;
DROP POLICY IF EXISTS "report-media: user can update own" ON storage.objects;
DROP POLICY IF EXISTS "report-media: user can delete own" ON storage.objects;

-- READ: все могут читать (бакет публичный).
CREATE POLICY "report-media: anyone can read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'report-media');

-- INSERT: authenticated только в свою папку reports/<telegram_id>/...
CREATE POLICY "report-media: user can upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-media'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = (
        current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
);

-- UPDATE: только своя папка.
CREATE POLICY "report-media: user can update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-media'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = (
        current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
);

-- DELETE: только своя папка.
CREATE POLICY "report-media: user can delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-media'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = (
        current_setting('request.jwt.claims', true)::json->>'telegram_id'
      )
);

-- ============================================================================
-- ПРОВЕРКА (после применения):
--   SELECT public.get_community_stats();     -- должно вернуть JSON
--   SELECT * FROM storage.buckets WHERE id='report-media';
--   SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass
--     AND polname LIKE 'report-media%';
-- ============================================================================
