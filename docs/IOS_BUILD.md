# Сборка M8 под iPhone (.ipa)

Apple разрешает сборку iOS-приложений **только на Mac** с Xcode — это ограничение Apple, с Windows не обойти. Ниже всё, что нужно, чтобы на любом Mac собрать приложение за ~15 минут.

## Что нужно на Mac
- macOS 13+
- Xcode 15+ (из App Store, бесплатно)
- Apple ID (бесплатно — для установки на СВОЙ iPhone; для App Store нужен платный аккаунт разработчика $99/год)
- Node.js 20+

## Шаги

```bash
# 1. Скопируйте проект на Mac (zip/flash/git) и откройте терминал в папке
cd chess-duolingo

# 2. Зависимости и web-сборка
npm install
npm run build

# 3. Добавьте iOS-платформу
npx cap add ios
npx cap sync ios

# 4. Откройте проект в Xcode
npx cap open ios
```

В Xcode:
1. В дереве слева выберите проект **M8** → таргет **M8**.
2. Signing & Capabilities: поставьте свою Team (Apple ID) — Xcode создаст подпись.
3. Подключите iPhone кабелем, выберите его сверху и нажмите **Run ▶**.
4. На iPhone: Настройки → Основные → Управление VPN и устройством → доверять вашему разработчику.

Готово — приложение стоит на телефоне.

## App Store (опционально)
- Нужен платный Apple Developer ($99/год)
- В Xcode: Product → Archive → Distribute App

## Если онлайн-функции нужны в приложении
Регистрация (Supabase) и оплата уже работают из webview: убедитесь только, что в `.env` указаны `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` перед `npm run build` (шаг 2).
