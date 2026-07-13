# FileStorage

Локальное веб-приложение для файлов, папок, закладок и заметок. Backend построен на Java 21, Spring WebFlux и PostgreSQL; frontend — на React, TypeScript и Vite.

## Возможности

- древовидное хранение папок и файлов;
- группы закладок и заметок с раскрываемыми секциями;
- создание и редактирование через модальные окна;
- компактные меню действий для папок, файлов, групп и карточек;
- загрузка файлов выбором или перетаскиванием;
- поддержка кириллицы в именах папок и файлов;
- регистрация с подтверждением email, подтверждение каждого входа и выход;
- смена пароля и изоляция данных каждого пользователя.

## Быстрый запуск для разработки

Требуются Java 21, Node.js и Docker.

```powershell
docker compose up -d
.\mvnw.cmd spring-boot:run
```

Для проверки отправки писем задайте для backend переменные `MAIL_*` и `APP_PUBLIC_URL` из `.env.example`. В другом терминале:

```powershell
cd frontend
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:5173`, API — на `http://localhost:8081`.

По умолчанию локально используется режим разработки `MAIL_ENABLED=false`: регистрация и вход работают без писем. Для проверки почты установите `MAIL_ENABLED=true` и настройте SMTP.

## Развёртывание на сервере

### Orange Pi

Для Orange Pi предусмотрен изолированный Compose-файл с собственной PostgreSQL и Docker-сетью. Он не использует контейнеры других проектов:

```bash
cp .env.orange-pi.example .env
# Замените DATABASE_PASSWORD и при необходимости TAILSCALE_IP в .env
docker compose -f compose.orange-pi.yaml up --build -d
```

По умолчанию интерфейс доступен только через Tailscale на порту `3001`. Путь `UPLOADS_PATH` можно позже перенести на смонтированный SSD без изменения контейнеров.

### Общая серверная схема

Production Compose использует существующие контейнер PostgreSQL `postgres` и внешнюю Docker-сеть `app-network`. В PostgreSQL предварительно создайте отдельные базу и пользователя `filestorage`.

Скопируйте `.env.example` в `.env`, укажите пароль БД, Tailscale IP сервера и тот же адрес в `APP_PUBLIC_URL`:

```env
DATABASE_PASSWORD=replace-with-a-long-random-password
TAILSCALE_IP=100.x.x.x
APP_PUBLIC_URL=http://100.x.x.x:8080
UPLOADS_PATH=/mnt/storage/filestorage/uploads
MAIL_ENABLED=false
```

Запуск:

```bash
docker compose -f compose.prod.yaml up --build -d
```

Интерфейс доступен только через `http://TAILSCALE_IP:8080`. Порт, каталог загрузок и максимальный размер файла задаются в `.env`. Compose не создаёт второй PostgreSQL.

## Данные

- PostgreSQL хранит папки и метаданные.
- Содержимое файлов хранится отдельно в каталоге `UPLOADS_PATH`.
- Удаление или перенос каталога загрузок приведёт к потере содержимого файлов.
- Перед обновлением рекомендуется сохранять дамп PostgreSQL и каталог загрузок вместе.

## Проверка

```powershell
.\mvnw.cmd test
cd frontend
npm run lint
npm run build
```

## Безопасность

Пароли хешируются BCrypt. Сессия хранится в PostgreSQL в виде SHA-256-хеша токена и передаётся через `HttpOnly` cookie. Изменяющие запросы защищены CSRF. После смены пароля завершаются все сессии пользователя.

Подробнее об устройстве проекта см. в [ARCHITECTURE.md](ARCHITECTURE.md), история изменений находится в [CHANGELOG.md](CHANGELOG.md).
