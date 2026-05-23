-- ============================================================================
-- 20260523_custom_access_token_hook.sql
--
-- Custom Access Token Hook для Supabase Auth.
--
-- Зачем нужно:
--   После перехода с кастомных HS256 JWT (которые мы выпускали сами в
--   auth-telegram Edge Function) на нативные Supabase Auth токены —
--   токены подписываются ES256-ключом Supabase, и telegram_id в них
--   по умолчанию НЕТ. Без telegram_id наши RLS-политики вида
--     (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint
--   перестанут срабатывать.
--
--   Этот hook запускается каждый раз, когда Supabase Auth выпускает
--   access_token, и копирует telegram_id из user_metadata в TOP-level
--   claim. После этого все существующие RLS-политики продолжают работать
--   БЕЗ изменений.
--
-- Setup:
--   1. Запустить эту миграцию в SQL Editor.
--   2. Dashboard → Authentication → Hooks → "Custom Access Token (Beta)" →
--      Enable + select public.custom_access_token_hook
--
-- ВАЖНО: user_metadata.telegram_id ставится в auth-telegram Edge Function
-- через admin.createUser({ user_metadata: { telegram_id, ... } }).
-- Без этого hook не сработает (telegram_id не появится в JWT).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims    jsonb;
  user_meta jsonb;
  tid_text  text;
BEGIN
  claims    := event->'claims';
  user_meta := claims->'user_metadata';
  tid_text  := user_meta->>'telegram_id';

  -- Защита от мусора: только если в metadata лежит непустая цифровая строка.
  IF tid_text IS NOT NULL AND tid_text ~ '^[0-9]+$' THEN
    claims := jsonb_set(claims, '{telegram_id}', to_jsonb(tid_text::bigint));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- supabase_auth_admin — единственная роль, которая запускает Auth Hooks.
-- Никакая клиентская роль не должна иметь возможность вызвать эту функцию
-- (иначе можно было бы подделать claims на стороне клиента).
GRANT  EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- ============================================================================
-- ПРОВЕРКА (после применения):
--   SELECT proname, prosrc IS NOT NULL AS has_body
--   FROM pg_proc
--   WHERE proname = 'custom_access_token_hook' AND pronamespace = 'public'::regnamespace;
--
-- После включения hook в Dashboard сделать verifyOtp и в Eruda decode JWT —
-- в payload должен появиться "telegram_id": 1365199221 рядом с "sub", "role".
-- ============================================================================
