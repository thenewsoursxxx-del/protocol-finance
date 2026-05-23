-- ============================================================================
-- 20260523_drop_permissive_users_policy.sql
--
-- Удаляет дырявую дефолтную политику "Enable read and insert for now"
-- с таблицы public.users. Эта политика разрешает SELECT/INSERT/UPDATE/DELETE
-- кому угодно (using=true, with_check=true) и сводит на нет все остальные
-- RLS-политики (RLS в Postgres permissive — любая прошедшая политика
-- разрешает доступ).
--
-- После применения на users останутся только корректные политики:
--   • Users can view own profile      (SELECT по telegram_id из JWT)
--   • Users can insert own profile    (INSERT с проверкой telegram_id)
--   • Users can update own profile    (UPDATE по telegram_id)
--   • Service role can manage all users (для Edge Functions с service_role)
-- ============================================================================

DROP POLICY IF EXISTS "Enable read and insert for now" ON public.users;

-- Проверка:
--   SELECT polname FROM pg_policy WHERE polrelid='public.users'::regclass;
-- Не должно быть строки "Enable read and insert for now".
