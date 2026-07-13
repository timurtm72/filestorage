# Установка FileStorage на Orange Pi с доступом через VPS

В документе описана рабочая production-схема:

```text
Интернет
   |
   | HTTPS: files.tm-port.ru
   v
VPS с публичным IP
   nginx + Let's Encrypt
   |
   | Tailscale
   v
Orange Pi Zero 3
   100.x.x.x:3001
   |
   +-- filestorage-frontend (nginx)
   +-- filestorage-backend (Spring Boot)
   +-- filestorage-db (PostgreSQL)
```

Orange Pi не публикует порт приложения в домашний интернет и не требует проброса портов на роутере. VPS принимает HTTPS-запросы и передаёт их на плату через приватную сеть Tailscale.

## 1. Требования

На Orange Pi:

- 64-битная Linux-система `aarch64`;
- Docker и Docker Compose;
- Git;
- работающий Tailscale;
- не менее 2 ГБ свободной оперативной памяти на время первой сборки;
- свободный порт Tailscale, по умолчанию `3001`.

На VPS:

- публичный IP;
- Tailscale в одной сети с Orange Pi;
- nginx;
- Certbot;
- DNS-запись поддомена, направленная на VPS.

Проверка Orange Pi:

```bash
hostname
uname -m
docker --version
docker compose version
free -h
tailscale status
```

Проверка занятых контейнеров, сетей и портов:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker network ls
ss -lntp
```

## 2. Клонирование проекта на Orange Pi

```bash
cd /opt
git clone https://github.com/timurtm72/filestorage.git
cd /opt/filestorage
git log -1 --oneline
```

FileStorage использует отдельные имена контейнеров, сеть и том базы данных, поэтому не подключается к контейнерам других проектов.

## 3. Настройка окружения

Создайте `.env` из подготовленного примера и сгенерируйте пароль PostgreSQL:

```bash
cd /opt/filestorage
cp .env.orange-pi.example .env

DB_PASSWORD="$(openssl rand -hex 32)"
sed -i "s/replace-with-a-long-random-password/$DB_PASSWORD/" .env
unset DB_PASSWORD
chmod 600 .env
```

Проверьте и при необходимости измените в `.env`:

```env
TAILSCALE_IP=100.x.x.x
APP_PORT=3001
UPLOADS_PATH=./data/uploads
APP_PUBLIC_URL=http://100.x.x.x:3001
MAIL_ENABLED=false
SECURE_COOKIE=false
```

Файл `.env` содержит пароль и не должен попадать в Git.

## 4. Первый запуск

```bash
cd /opt/filestorage
mkdir -p data/uploads

docker compose --env-file .env -f compose.orange-pi.yaml config --quiet
docker compose --env-file .env -f compose.orange-pi.yaml up --build -d
```

Первая сборка загружает образы Java, Node.js, nginx и PostgreSQL и может занять 5–15 минут.

Проверка:

```bash
docker compose --env-file .env -f compose.orange-pi.yaml ps
curl -I http://TAILSCALE_IP:3001
```

Все три контейнера должны перейти в состояние `healthy`:

- `filestorage-db`;
- `filestorage-backend`;
- `filestorage-frontend`.

## 5. Проверка соединения VPS с Orange Pi

На VPS:

```bash
tailscale status
curl -I --connect-timeout 10 http://TAILSCALE_IP_ORANGE_PI:3001
```

Ожидается ответ `HTTP/1.1 200 OK`. Если его нет, проверьте состояние Tailscale и привязку `TAILSCALE_IP` в `.env` на Orange Pi.

## 6. DNS и reverse proxy на VPS

Создайте A-запись `files` для домена, указывающую на публичный IP VPS. Проверка:

```bash
getent ahostsv4 files.tm-port.ru
```

Создайте `/etc/nginx/sites-available/filestorage`:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name files.tm-port.ru;
    client_max_body_size 1g;

    location / {
        proxy_pass http://TAILSCALE_IP_ORANGE_PI:3001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
    }
}
```

Включите конфигурацию:

```bash
ln -s /etc/nginx/sites-available/filestorage /etc/nginx/sites-enabled/filestorage
nginx -t
systemctl reload nginx
curl -I http://files.tm-port.ru
```

Перед перезагрузкой nginx команда `nginx -t` обязательно должна завершиться успешно.

## 7. HTTPS

На VPS:

```bash
certbot --nginx -d files.tm-port.ru --redirect
nginx -t
curl -I https://files.tm-port.ru
certbot renew --dry-run
```

Certbot добавляет сертификат в nginx и устанавливает автоматическое продление.

После включения HTTPS измените `/opt/filestorage/.env` на Orange Pi:

```env
APP_PUBLIC_URL=https://files.tm-port.ru
SECURE_COOKIE=true
```

Примените настройки:

```bash
cd /opt/filestorage
docker compose --env-file .env -f compose.orange-pi.yaml up -d --no-deps --force-recreate backend
sleep 60
docker compose --env-file .env -f compose.orange-pi.yaml ps
docker compose --env-file .env -f compose.orange-pi.yaml up -d --no-deps --force-recreate frontend
```

## 8. Обновление приложения

Перед обновлением сделайте резервную копию. Затем:

```bash
cd /opt/filestorage
git pull --ff-only
docker compose --env-file .env -f compose.orange-pi.yaml up --build -d
docker compose --env-file .env -f compose.orange-pi.yaml ps
```

Просмотр журналов:

```bash
docker compose --env-file .env -f compose.orange-pi.yaml logs --tail=100
docker compose --env-file .env -f compose.orange-pi.yaml logs -f backend
```

## 9. Резервное копирование

Метаданные находятся в PostgreSQL, а содержимое файлов — в `UPLOADS_PATH`. Их нужно копировать согласованно.

Дамп базы:

```bash
cd /opt/filestorage
mkdir -p backups
docker exec filestorage-db pg_dump -U filestorage -d filestorage -Fc > backups/filestorage-$(date +%F-%H%M).dump
```

Копия файлов:

```bash
tar -C data -czf backups/uploads-$(date +%F-%H%M).tar.gz uploads
```

Файлы резервных копий следует переносить на другое физическое устройство.

## 10. Перенос загрузок на SSD

Сначала подключите и смонтируйте SSD в постоянный каталог, например `/mnt/filestorage`. Используйте UUID раздела в `/etc/fstab`, а не имя `/dev/sdX`, которое может измениться после перезагрузки.

Остановите backend и frontend, скопируйте данные и измените `.env`:

```bash
cd /opt/filestorage
docker compose --env-file .env -f compose.orange-pi.yaml stop frontend backend

mkdir -p /mnt/filestorage/uploads
cp -a data/uploads/. /mnt/filestorage/uploads/
sed -i 's|^UPLOADS_PATH=.*|UPLOADS_PATH=/mnt/filestorage/uploads|' .env

docker compose --env-file .env -f compose.orange-pi.yaml up -d
```

Удаляйте старую копию только после проверки загрузки и скачивания файлов. PostgreSQL по умолчанию остаётся в именованном Docker-томе на системном диске; его перенос следует выполнять отдельно через резервную копию и восстановление.

## 11. Диагностика

Состояние контейнеров:

```bash
docker compose --env-file .env -f compose.orange-pi.yaml ps
docker inspect filestorage-frontend --format '{{range .State.Health.Log}}{{println .ExitCode .Output}}{{end}}'
```

Проверка каждого участка маршрута:

```text
Orange Pi: curl -I http://TAILSCALE_IP_ORANGE_PI:3001
VPS:       curl -I http://TAILSCALE_IP_ORANGE_PI:3001
Интернет:  curl -I https://files.tm-port.ru
```

Если nginx не запускается:

```bash
nginx -t
journalctl -u nginx -n 100 --no-pager
```

Если контейнер перезапускается:

```bash
docker logs --tail=100 ИМЯ_КОНТЕЙНЕРА
```

## 12. Почта

По умолчанию `MAIL_ENABLED=false`, поэтому приложение работает без SMTP. Для production-регистрации с подтверждением адреса настройте переменные `MAIL_*`, установите `MAIL_ENABLED=true` и пересоздайте backend. Не публикуйте SMTP-пароль в Git.

