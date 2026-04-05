# Production deployment checklist

## 1. Что уже сделано

- статическая production-структура без сборщика;
- favicon-набор и manifest;
- `robots.txt` и `sitemap.xml`;
- `CleaningService` и `FAQPage` schema;
- базовые security meta;
- anti-spam на клиенте;
- оптимизированная навигация и hash-routing;
- read-only карта и конфиг отзывов.

## 2. Что обязательно заменить перед релизом

- `https://example.com/` в [index.html](/D:/www/Клининг/aquablesk-site-static/index.html)
- `https://example.com/` в [robots.txt](/D:/www/Клининг/aquablesk-site-static/robots.txt)
- `https://example.com/` в [sitemap.xml](/D:/www/Клининг/aquablesk-site-static/sitemap.xml)
- verification codes в [index.html](/D:/www/Клининг/aquablesk-site-static/index.html)
- реальные реквизиты в политике
- реальные review URLs и QR в [site-config.js](/D:/www/Клининг/aquablesk-site-static/site-config.js)

## 3. DNS / домен / SSL

- подключить основной домен и `www` при необходимости;
- настроить редирект на одну каноническую версию;
- включить HTTPS;
- включить автоматическое продление SSL;
- проверить, что mixed content отсутствует.

## 4. Nginx / Apache / hosting

- настроить long-cache для:
  - `*.css`
  - `*.js`
  - `*.png`
  - `*.jpg`
  - `*.svg`
  - `*.ico`
- включить `gzip` или `brotli`;
- отдать корректные `Content-Type` для:
  - `.svg`
  - `.webmanifest`
  - `.xml`
  - `.ico`
- убедиться, что `index.html` отдается без лишнего кеша при активных обновлениях сайта.

## 5. Cloudflare

Рекомендуемая базовая настройка:

- SSL/TLS: `Full (strict)`
- Always Use HTTPS: `On`
- Automatic HTTPS Rewrites: `On`
- Brotli: `On`
- HTTP/3: `On`
- Auto Minify: `HTML/CSS/JS`
- Caching Level: `Standard`
- Browser Cache TTL: `1 month` для статики
- Early Hints: `On`
- Bot Fight Mode: `On` по ситуации

Рекомендуемые правила:

- cache static assets aggressively;
- не кешировать HTML слишком долго на этапе активных правок;
- ограничить подозрительные POST/спам-запросы на форму, если будет backend;
- подключить `Cloudflare Turnstile` для форм после появления серверной отправки.

## 6. Защита форм и антибот

Сейчас уже есть:

- honeypot;
- минимальное время заполнения;
- клиентская проверка телефона и имени.

Для реального production нужно добавить:

- серверную валидацию;
- rate limiting;
- Turnstile / reCAPTCHA;
- логирование подозрительных запросов;
- ограничение частоты по IP;
- fail2ban / WAF-правила на сервере или через Cloudflare.

## 7. Security headers

Рекомендуется включить на сервере:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Frame-Options: DENY` или аналог через CSP
- `Strict-Transport-Security` после полной проверки HTTPS

## 8. Производительность

- конвертировать крупные JPG в WebP/AVIF и добавить fallback;
- не хранить лишние исходники рядом с production;
- lazy-load для некритичных изображений;
- preload только для hero image;
- сжать изображения перед выкладкой;
- проверить размер `style.css` и `script.js` после стабилизации дизайна;
- по возможности вынести изображения услуг в modern formats.

## 9. SEO checklist

- заменить placeholder домен;
- отправить sitemap в Search Console и Вебмастер;
- проверить favicon по прямому URL;
- проверить `robots.txt`;
- проверить rich results;
- проверить canonical;
- проверить сниппет главной;
- проверить локальную выдачу по Хабаровску;
- завести карточку компании в Яндекс Бизнес;
- по возможности завести Google Business Profile.

## 10. После публикации

- Google Search Console:
  - подтвердить домен
  - отправить sitemap
  - проверить indexing
  - проверить favicon
- Яндекс Вебмастер:
  - подтвердить сайт
  - отправить sitemap
  - проверить региональность
  - проверить favicon и сниппет
- Яндекс Бизнес:
  - подтвердить организацию
  - заполнить адрес, телефон, график, фото
  - связать отзывы

## 11. Проверка вручную перед релизом

- все кнопки нажимаются;
- карта открывается;
- QR-ссылки ведут куда нужно;
- формы не ломают layout;
- меню скроллит в нужный блок;
- favicon виден во вкладке;
- телефон `tel:` работает;
- WhatsApp-ссылка работает;
- на mobile нет поломанной сетки;
- нет 404 на ассеты.

