# Link Calendar — календарь по ссылке (без авторизации)

Простой онлайн‑календарь без авторизации. Пользователь создаёт календарь и получает постоянную ссылку (UUID). Любой, у кого есть ссылка, может просматривать календарь и добавлять/редактировать/удалять события.

## Быстрый старт

1) Установите Docker Desktop / Docker Engine.
2) В корне репозитория запустите:
```bash
docker compose up -d --build
```
3) Откройте интерфейс:
- UI: http://localhost:8080
- API (Swagger): http://localhost:8000/docs

## Архитектура

Проект состоит из трёх контейнеров (Docker Compose):

- frontend (Nginx)
  - Отдаёт статическую страницу `frontend/index.html` с FullCalendar (через CDN).
  - Проксирует запросы `/api/*` на `backend:8000`.
  - Порт: 8080 (проброшен на хост).

- backend (FastAPI)
  - REST API: создание календаря, выдача данных по календарю, CRUD событий.
  - SQLAlchemy + PostgreSQL.
  - При старте ожидает готовность БД (retry) и создаёт таблицы.
  - Порт: 8000 (проброшен на хост).

- db (PostgreSQL)
  - Хранение календарей и событий.
  - Volume `db_data` сохраняет данные между рестартами.
  - Healthcheck для ожидания готовности.

Поток запросов:

Браузер → Nginx (frontend) → /api/* → FastAPI (backend) → PostgreSQL (db)

## Схема данных

- Таблица `calendars`:
  - `id` (PK), `uuid` (TEXT, уникальный), `created_at` (TIMESTAMP).

- Таблица `events`:
  - `id` (PK), `calendar_id` (FK → calendars.id, on delete cascade),
  - `title` (TEXT), `description` (TEXT, nullable),
  - `start` (TIMESTAMP), `end` (TIMESTAMP),
  - `created_at` (TIMESTAMP).
  - Индекс: `(calendar_id, start)`.

Замечание по времени: интерфейс работает в локальной таймзоне браузера. Для однодневных событий без времени на API отправляется интервал `00:00:00..23:59:59` выбранной даты; на клиенте такие события отображаются полосой и не перетекают на следующий день.

## API (основные эндпоинты)

- POST `/api/calendars`
  - Создаёт календарь.
  - Ответ: `{ uuid: string, share_url: string }`.

- GET `/api/calendars/{uuid}`
  - Возвращает календарь и его события.
  - Ответ: `{ uuid: string, events: Event[] }`.

- GET `/api/calendars/{uuid}/events`
  - Список событий календаря.

- POST `/api/calendars/{uuid}/events`
  - Создаёт событие.
  - Тело: `{ title: string, description?: string, start: ISOString, end: ISOString }`.
  - Валидация: `end >= start`, `title` обязателен.

- PUT `/api/calendars/{uuid}/events/{event_id}`
  - Частичное обновление: можно передавать любой из полей `title`, `description`, `start`, `end`.

- DELETE `/api/calendars/{uuid}/events/{event_id}`
  - Удаляет событие.

Полная спецификация в Swagger: http://localhost:8000/docs

## Поведение фронтенда

- На главной странице:
  - Создание календаря (получение UUID и ссылки для шаринга),
  - Открытие существующего календаря по UUID,
  - Просмотр в FullCalendar (месяц/неделя/день),
  - Добавление события (дата обязательна, время — опционально),
  - Перетаскивание/растяжение событий (drag/resize),
  - Удаление события по клику (с подтверждением).

- Однодневные события без времени отображаются как allDay‑полоса ровно на выбранный день.

## Конфигурация (docker-compose)

- backend env:
  - `POSTGRES_USER` (default: `calendar`)
  - `POSTGRES_PASSWORD` (default: `calendar`)
  - `POSTGRES_DB` (default: `calendar`)
  - `POSTGRES_HOST` (default: `db`)
  - `POSTGRES_PORT` (default: `5432`)
  - `CORS_ORIGIN` (default: `*`) — в docker не критично, так как используется прокси.
  - `PUBLIC_ORIGIN` (default: `http://localhost:8080`) — базовый origin для публичных ссылок.

- db env:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — должны совпадать с backend.

Порты:
- `frontend: 8080 -> 8080`
- `backend: 8000 -> 8000`
- `db: 5432 -> 5432`

## Команды

- Запуск всех сервисов:
```bash
docker compose up -d --build
```
- Пересобрать только frontend (после правок статики):
```bash
docker compose up -d --build frontend
```
- Пересобрать только backend (после правок Python/зависимостей):
```bash
docker compose up -d --build backend
```
- Логи backend:
```bash
docker compose logs -f backend
```

## Технические детали

- Backend: FastAPI, SQLAlchemy 2.x, psycopg 3 (binary), Uvicorn.
  - Ожидание готовности БД (healthcheck + retry), автосоздание таблиц.
  - Время хранится как `TIMESTAMP`; клиент отправляет строки без суффикса `Z` (локальная зона).
- Frontend: Nginx + FullCalendar (CDN), одна HTML‑страница без сборки.
  - Таймзона отображения — локальная; `/api/*` проксируются на backend.
- DB: PostgreSQL 16‑alpine, данные во `volume`.

## Ограничения и безопасность

- Доступ по секретной ссылке (UUID). Любой, у кого есть ссылка, может редактировать.
- Авторизация/роли отсутствуют (минимальная реализация по ТЗ).
- Ограничение длины полей, базовая валидация дат.
- При необходимости можно добавить rate limiting/капчу и роли в будущих версиях.

## Разработка (локально)

- Backend без Docker:
```bash
pip install -r backend/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```
- Фронтенд напрямую: открыть `frontend/index.html` в браузере (для API использовать docker или параметр `?api=http://localhost:8000`).

—
Если нужна авторизация/роли, фильтры по датам, напоминания или экспорт (iCal/ICS) — легко расширяемо.