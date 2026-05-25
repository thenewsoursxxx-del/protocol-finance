-- BROADCASTS: история рассылок и opt-out пользователей.
--
-- Цели:
--   1. Хранить аудит-историю всех админских рассылок (текст, кнопки, фильтр,
--      количество получателей, успех/ошибки) для контроля и отладки.
--   2. Дать пользователю возможность отписаться от промо-рассылок через
--      команду /unsubscribe в боте (требование Telegram для массовых
--      сообщений: спам = риск бана бота).
--
-- DEPLOY:
--   Supabase Dashboard → SQL Editor → выполнить весь файл.

-- ── 1. Колонка notifications_opt_out в users ────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notifications_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.notifications_opt_out IS
  'Пользователь отписался от промо-рассылок через /unsubscribe в боте. Транзакционные сообщения (premium expired, renewal reminder) всё равно отправляются.';

-- ── 2. Таблица broadcasts (история) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  text            text NOT NULL,
  parse_mode      text,
  buttons         jsonb,
  filter          jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_count    integer NOT NULL DEFAULT 0,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  blocked_count   integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  error           text
);

CREATE INDEX IF NOT EXISTS broadcasts_created_at_idx
  ON public.broadcasts (created_at DESC);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Полностью изолировано: читает / пишет только service_role
-- (Edge Function), обычные клиенты не имеют доступа.
DROP POLICY IF EXISTS "broadcasts: service_role full access" ON public.broadcasts;
CREATE POLICY "broadcasts: service_role full access"
  ON public.broadcasts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── 3. (опционально) per-message log ────────────────────────────────────────
-- Если рассылка большая (> 1k) и хочется знать, кому что доставлено,
-- раскомментируй блок ниже. Для маленькой базы достаточно агрегатных
-- счётчиков в broadcasts.
--
-- CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
--   id            bigserial PRIMARY KEY,
--   broadcast_id  uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
--   telegram_id   bigint NOT NULL,
--   status        text NOT NULL,                       -- 'sent' | 'failed' | 'blocked' | 'skipped'
--   error         text,
--   sent_at       timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS broadcast_recipients_bc_idx
--   ON public.broadcast_recipients (broadcast_id);
-- ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "broadcast_recipients: service_role full access" ON public.broadcast_recipients;
-- CREATE POLICY "broadcast_recipients: service_role full access"
--   ON public.broadcast_recipients FOR ALL TO service_role
--   USING (true) WITH CHECK (true);
