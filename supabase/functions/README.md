# Telegram Stars Edge Functions

Две функции для оплаты Premium через Telegram Stars (450 ⭐).

## 1. Сначала задайте секреты в Supabase

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
# SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны автоматически в Edge Functions.
```

## 2. Деплой обеих функций

```bash
supabase functions deploy create-stars-invoice --no-verify-jwt
supabase functions deploy stars-payment-webhook --no-verify-jwt
```

`--no-verify-jwt` нужен, потому что mini app шлёт запрос анонимно (auth идёт
через `init_data` Telegram WebApp, который функция верифицирует сама через
HMAC-SHA256 с `BOT_TOKEN`).

## 3. Настройте Telegram webhook бота на функцию

```bash
SECRET=$(supabase secrets list | grep TELEGRAM_WEBHOOK_SECRET | awk '{print $2}')
PROJECT_URL=https://<your-project>.supabase.co

curl -F "url=$PROJECT_URL/functions/v1/stars-payment-webhook" \
     -F "secret_token=$SECRET" \
     -F "allowed_updates=[\"pre_checkout_query\",\"message\"]" \
     https://api.telegram.org/bot<TOKEN>/setWebhook
```

## 4. Проверьте

В Telegram-приложении откройте mini app → нажмите «Оформить Premium» →
должен открыться нативный Stars-paywall на 450 ⭐. После успешной оплаты
функция `stars-payment-webhook` автоматически проставит `users.is_premium=true`.

## Архитектура

```
Client (mini app)
   │
   │ POST /functions/v1/create-stars-invoice  { telegram_id, init_data }
   ▼
[create-stars-invoice]──────► Bot API: createInvoiceLink (currency=XTR, amount=450)
   │                                  │
   │ ◄────────────── invoice_url ─────┘
   ▼
Client: tg.openInvoice(invoice_url, callback)
   │
   ▼ user pays in Telegram native UI
   │
   │ Telegram → bot webhook (= stars-payment-webhook)
   ▼
[stars-payment-webhook]
   ├── pre_checkout_query: answer ok=true
   └── successful_payment: UPDATE users SET is_premium=true WHERE telegram_id=...
   │
   ▼
Client: callback("paid") → optimistic appState.isPremium=true, refresh UI
Client: syncUserAccessFlagsFromDB() через ~800мс подтверждает из БД
```
