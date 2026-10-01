# Промпт улучшения дизайна ChessUp

Как пользоваться: запустите новый чат в ZCode с рабочей папкой `chess-duolingo`, вставьте промпт ниже целиком — агент выполнит редизайн по фазам. Русская версия основная; английская адаптация и вариации — ниже.

## Готовый промпт (русская версия — основная)

```text
Ты — продуктовый дизайнер и фронтендер уровня топовых приложений (Duolingo, Chess.com,
Notion). Твоя задача — поднять визуальный уровень приложения до премиального, не меняя
его логику и структуру. Работай поэтапно: после каждой фазы код должен оставаться
рабочим, в конце фазы — короткое резюме (что и где изменено).

## Контекст проекта

ChessUp — геймифицированное приложение для обучения шахматам в стиле Duolingo: карта
уроков, пазлы, игра против движка, ежедневные миссии, лиги, стрики, XP и премиум-подписка.
Контент двуязычный (русский — основной, английский — переключатель). Целевые платформы:
веб/PWA, десктоп (Tauri), мобильные (Capacitor).

Стек: React 19 + TypeScript + Vite 8, Tailwind CSS v4 (CSS-first конфигурация через
блок @theme в src/index.css, отдельного tailwind.config нет). Тёмная тема — через
CSS-переменные [data-theme="dark"].

Ключевые файлы:
- src/index.css — единственный глобальный стилевой файл: CSS-переменные тем,
  .glass-card, ~10 keyframe-анимаций
- src/App.tsx — каркас: верхняя панель (XP, стрик, корона), нижняя навигация
  (5 вкладок), переключение 10 экранов
- src/components/LessonMap.tsx, LessonPath.tsx — карта уроков (первое впечатление)
- src/components/PremiumScreen.tsx — экран подписки (главный конверсионный экран;
  в нём баг: символ ₽ отображается как «?» — файл в неверной кодировке)
- src/components/PlayScreen.tsx, ChessPuzzle.tsx — игра и пазлы
- src/components/Profile.tsx, DailyScreen.tsx, PracticeScreen.tsx, ReviewScreen.tsx

Текущий стиль: ч/б минимализм — чернила #111111, бумага #fafafa, приглушённый #6b6b6b;
акценты: синий #2563eb (основной), зелёный #22c55e (успех), красный #ef4444 (ошибка),
золотой градиент #f59e0b (XP и Premium). Шрифт Inter. Доска — классические
lichess-коричневые #f0d9b5 / #b58863.

Подтверждённые проблемы:
1. ~280 inline-стилей style={{}} в компонентах — в основном просто ради применения
   CSS-переменных.
2. Две дублирующиеся системы цветов: @theme в index.css и переменные :root.
3. Все иконки интерфейса — эмодзи (🔥, 👑 и т.д.) — главный источник «дешёвого» вида.
4. Нет шкал типографики и отступов: размеры заданы ad hoc, ритм «прыгает».
5. Символ ₽ в PremiumScreen.tsx сохранён как «?» — неверная кодировка файла.

## Задача

Вывести дизайн на уровень дорогого продукта: цельная дизайн-система, профессиональная
типографика, единые SVG-иконки, выверенные микродетали. Направление сохранить: ч/б
минимализм с золотым акцентом. Это полировка существующего, а не редизайн с нуля.

## Инструкции

Фаза 1. Фундамент: дизайн-токены
- Объедини цвета в единую систему @theme в index.css; устрани дублирование @theme/:root
  (переменные тем — с семантическими именами: bg / ink / muted / accent / success /
  danger / gold).
- Добавь шкалы: типографика (4–5 размеров с межстрочными), отступы (4/8/12/16/24/32/48),
  радиусы (sm/md/lg/full), тени (2–3 уровня: subtle для карточек, medium для поднятых
  элементов, тёплое золотое свечение для Premium/XP).
- Каждый новый токен должен иметь пару для тёмной темы [data-theme="dark"].

Фаза 2. Иконки
- Установи lucide-react — минималистичные SVG-иконки, идеально ложатся на этот стиль.
- Замени все эмодзи-иконки интерфейса (верхняя панель, нижняя навигация, кнопки,
  бейджи, вкладки) на компоненты Lucide одного веса; основной размер 20px, навигация
  24px, stroke-width единый.
- Эмодзи в пользовательском контенте и иллюстрациях уроков не трогай.

Фаза 3. Типографика и ритм
- Выровняй заголовки, основной текст и подписи по шкале из Фазы 1 на всех экранах.
- Устрани прыгающие отступы: между секциями — один шаг шкалы, внутри секций — меньший.

Фаза 4. Полировка экранов по приоритету
1. Карта уроков (LessonMap/LessonPath) — первое впечатление: чёткая иерархия узлов,
   различимые состояния (пройдено / доступно / закрыто).
2. Premium — конверсионный экран: золотой градиент дозированно и благородно; выгоды —
   строгая иерархия от главной; кнопка покупки — самая заметная на экране, но без
   «кричащих» приёмов. Заодно исправь кодировку файла — ₽ должен отображаться.
3. Игра и пазлы (PlayScreen, ChessPuzzle): панели вокруг доски, кнопки действий,
   статусы хода.
4. Профиль, Daily, Practice, Review: единообразие карточек, заголовков и пустых
   состояний.

Фаза 5. Рефакторинг стилей
- Устрани inline-стили: применение CSS-переменных замени на Tailwind-классы с токенами.
  Динамические значения (позиции анимаций и т.п.) можно оставить — но их должно быть
  минимальное количество.
- Кнопки: единые варианты (primary / secondary / ghost / danger) с состояниями
  hover / active / focus-visible.

Фаза 6. Микродетали и проверка
- Переходы 150–250ms ease, focus-visible для клавиатурной доступности, согласованность
  теней и радиусов.
- Прогони npm run build (tsc -b && vite build): типы и сборка должны быть чистыми;
  новых замечаний oxlint — ноль.

## Ограничения

- Логику, тексты, i18n-ключи, структуру экранов и навигацию не менять.
- Палитру кардинально не менять: ч/б + существующие акценты.
- Тёмная тема остаётся консистентной со светлой.
- Мобильную адаптацию и PWA не ломать.
- Новые зависимости: только lucide-react.

## Критерии приёмки (проверь перед завершением)

- Единая система токенов, дублей @theme/:root нет
- В интерфейсном хроме ноль эмодзи-иконок
- Inline-стилей — только неизбежный динамический минимум
- Premium выглядит дорого: иерархия выгод, заметная CTA, корректный ₽
- Тёмная тема консистентна
- npm run build зелёный
```

## English version

```text
You are a product designer and frontend engineer at the level of top-tier apps
(Duolingo, Chess.com, Notion). Your task: raise this app's visual quality to premium
without touching its logic or structure. Work in phases — after each phase the code
must still build and run; end each phase with a short summary of what changed.

## Project context

ChessUp — a Duolingo-style gamified chess-learning app: lesson map, puzzles, play
against the engine, daily missions, leagues, streaks, XP, and a premium subscription.
Bilingual content (Russian primary, English toggle). Targets: web/PWA, desktop (Tauri),
mobile (Capacitor).

Stack: React 19 + TypeScript + Vite 8, Tailwind CSS v4 (CSS-first config via the
@theme block in src/index.css; no tailwind.config). Dark mode via [data-theme="dark"]
CSS variables.

Key files:
- src/index.css — the single global stylesheet: theme variables, .glass-card, ~10
  keyframe animations
- src/App.tsx — app shell: top bar (XP, streak, crown), bottom nav (5 tabs),
  10 screens switched in place
- src/components/LessonMap.tsx, LessonPath.tsx — lesson map (first impression)
- src/components/PremiumScreen.tsx — subscription screen (the main conversion
  surface; known bug: the ₽ symbol renders as "?" — file saved in a wrong encoding)
- src/components/PlayScreen.tsx, ChessPuzzle.tsx — play and puzzles
- src/components/Profile.tsx, DailyScreen.tsx, PracticeScreen.tsx, ReviewScreen.tsx

Current style: monochrome minimalism — ink #111111, paper #fafafa, muted #6b6b6b;
accents: blue #2563eb (primary), green #22c55e (success), red #ef4444 (danger), gold
gradient #f59e0b (XP and Premium). Font: Inter. Board: classic lichess browns
#f0d9b5 / #b58863.

Known issues:
1. ~280 inline style={{}} blocks, mostly just applying CSS variables.
2. Two duplicate color systems: @theme in index.css and :root variables.
3. All UI icons are emoji (🔥, 👑 …) — the main source of the "cheap" look.
4. No typography or spacing scales; sizes are ad hoc, rhythm jumps.
5. The ₽ symbol in PremiumScreen.tsx is stored as "?" — wrong file encoding.

## Task

Bring the design to a premium level: a cohesive design system, professional
typography, consistent SVG icons, refined micro-details. Keep the direction:
monochrome minimalism with a gold accent. This is a polish pass, not a redesign.

## Instructions

Phase 1. Foundation: design tokens
- Unify colors into a single @theme system in index.css; eliminate the @theme/:root
  duplication (semantic names: bg / ink / muted / accent / success / danger / gold).
- Add scales: typography (4–5 sizes with line heights), spacing (4/8/12/16/24/32/48),
  radii (sm/md/lg/full), shadows (2–3 levels: subtle for cards, medium for raised
  elements, a warm gold glow for Premium/XP).
- Every new token gets a dark-mode counterpart under [data-theme="dark"].

Phase 2. Icons
- Install lucide-react — minimalist SVG icons that fit this style perfectly.
- Replace every UI emoji icon (top bar, bottom nav, buttons, badges, tabs) with Lucide
  components of one consistent weight; base size 20px, nav 24px, uniform stroke width.
- Leave emoji in user-facing content and lesson illustrations alone.

Phase 3. Typography and rhythm
- Align headings, body, and captions across all screens to the Phase-1 scale.
- Fix jumping spacing: one scale step between sections, a smaller one inside them.

Phase 4. Screen polish, in priority order
1. Lesson map (LessonMap/LessonPath) — first impression: clear node hierarchy,
   distinct states (completed / unlocked / locked).
2. Premium — the conversion screen: gold gradient applied sparingly and with taste;
   benefits in strict hierarchy from the main one down; the purchase button is the
   most prominent element on the screen — without loud gimmicks. Fix the file
   encoding so ₽ renders correctly.
3. Play and puzzles (PlayScreen, ChessPuzzle): panels around the board, action
   buttons, move statuses.
4. Profile, Daily, Practice, Review: consistent cards, headers, and empty states.

Phase 5. Style refactor
- Remove inline styles: CSS-variable applications become Tailwind classes built on
  tokens. Genuinely dynamic values (animation positions etc.) may stay — but keep
  them to a minimum.
- Buttons: unified variants (primary / secondary / ghost / danger) with
  hover / active / focus-visible states.

Phase 6. Micro-details and verification
- Transitions 150–250ms ease, focus-visible for keyboard accessibility, consistent
  shadows and radii.
- Run npm run build (tsc -b && vite build): types and build must be clean; zero new
  oxlint findings.

## Constraints

- Do not change logic, copy, i18n keys, screen structure, or navigation.
- Do not radically change the palette: monochrome + existing accents.
- Dark mode stays consistent with light mode.
- Do not break mobile layout or PWA behavior.
- New dependencies: lucide-react only.

## Acceptance criteria (verify before finishing)

- Single token system; no @theme/:root duplication
- Zero emoji icons in UI chrome
- Inline styles reduced to an unavoidable dynamic minimum
- Premium looks expensive: benefit hierarchy, prominent CTA, correct ₽
- Dark theme consistent
- npm run build is green
```

## Что внутри и почему

- **Фаза токенов идёт первой.** Все четыре ваши боли связаны: без единой системы цветов, шкал и иконок полировка экранов превратится в разрозненные правки. Токены — фундамент, на котором фазы 3–4 делаются быстро и согласованно.
- **lucide-react вместо эмодзи — конкретный выбор.** «Замени иконки» без имени библиотеки — типичная причина, по которой агент ставит случайный пакет. Lucide — минимализм штриха 2px, идеально ложится на ч/б стиль и Inter.
- **Premium — второй приоритет после карты уроков.** Вы назвали конверсию среди болей: карта уроков создаёт первое впечатление (retention), Premium — деньги. Для него прописаны анти-«дешёвые» правила: дозированное золото, строгая иерархия выгод, заметная, но благородная CTA.
- **Рамки зафиксированы явно.** «Не трогать логику, тексты, i18n, структуру» — чтобы полировка не переросла в переписывание приложения, и `npm run build` зелёный как критерий, что ничего не сломано.
- **₽-баг вписан в контекст.** Мелочь, но она напрямую влияет на конверсионный экран — агент исправит её попутно, а не «забудет».

## Вариации

1. **Быстрая версия (только визуал, без рефакторинга).** Если нужно быстро показать результат заказчику: оставьте Фазы 2, 3, 4 и 6, уберите Фазу 1 (токены) и Фазу 5 (inline-стили). Результат менее устойчивый, но заметный за один проход.
2. **Фокус на конверсию Premium.** Если главный приоритет — деньги: начните с Фазы 1 (только цвета/тени) и Фазы 4.2, добавьте в контекст: «A/B-мышление: изменения Premium-экрана должны быть обоснованы конверсионной логикой (социальное доказательство, снятие рисков, ясность выгод)». Остальные экраны — следующим проходом.
3. **Вариант с UI-библиотекой.** Если хотите ускорить долгую разработку: замените Фазы 1, 5 и 6 на «подключи shadcn/ui, перенеси кнопки, карточки и модалки на его компоненты, токены темы замапь на CSS-переменные shadcn». Дороже по времени сразу, дешевле в поддержке потом.

---

Запусти промпт в новом чате ZCode с рабочей папкой chess-duolingo. Если результат не устроит — скажите, что именно («доска стала хуже», «Premium слишком пёстрый», «тёмная тема сломалась»), и промпт можно точечно доработать.
