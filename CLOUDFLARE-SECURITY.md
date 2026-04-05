# Cloudflare Security

Базовый набор настроек для production-развёртывания сайта `АкваБлеск`.

## Что включить

- `SSL/TLS`: `Full (strict)`
- `Always Use HTTPS`: `On`
- `Automatic HTTPS Rewrites`: `On`
- `HTTP/3`: `On`
- `Bot Fight Mode`: `On`
- `Browser Integrity Check`: `On`
- `Email Obfuscation`: `On`
- `Security Level`: `Medium`

## WAF

Включить:

- `Cloudflare Managed Ruleset`
- `OWASP Core Ruleset`

Дополнительно создать правило challenge для подозрительных запросов к:

- `/api/leads`
- `/api/admin/login`
- `/admin/*`

## Rate Limiting

### 1. Заявки

- Expression: `http.request.uri.path eq "/api/leads"`
- Method: `POST`
- Action: `Managed Challenge`
- Threshold: `5 requests`
- Period: `10 minutes`

### 2. Вход в админку

- Expression: `http.request.uri.path eq "/api/admin/login"`
- Method: `POST`
- Action: `Block` или `Managed Challenge`
- Threshold: `10 requests`
- Period: `15 minutes`

### 3. Админка

- Expression: `starts_with(http.request.uri.path, "/admin")`
- Action: `Managed Challenge`

## Cache Rules

### Bypass cache

Не кешировать:

- `/api/*`
- `/admin/*`

### Static cache

Разрешить обычное кеширование для:

- `/assets/*`
- `*.css`
- `*.js`
- `*.png`
- `*.jpg`
- `*.svg`
- `*.webp`
- `favicon*`

## Bot / Spam Protection

- Подключить `Turnstile` на формы, если сайт открывается публично и идёт поток спама.
- Оставить серверный rate limiting для `/api/leads` и `/api/admin/login` включённым.
- Не публиковать прямую ссылку на админку в открытой рекламе.

## Рекомендации

- Ограничить доступ к `/admin/*` по `Cloudflare Access`, если проект идёт в реальный production.
- Проверить, что Cloudflare не кеширует HTML-страницы админки и API-ответы.
- После включения правил проверить:
  - отправку формы
  - вход в админку
  - загрузку изображений
  - открытие карты и QR-ссылок
