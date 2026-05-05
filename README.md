# Utsikten P15 Akademi - Matcher och fika

One-page web app for a football team:
- Displays all games from an ICS calendar feed.
- Detects home games (where the home team name appears first).
- Lets parents sign up or remove fika responsibility with a 4-digit PIN.
- Maximum 2 parents per home game.

UI text is in Swedish, code is in English.

## Tech Stack

- Next.js (App Router) + TypeScript
- shadcn/ui + Tailwind CSS
- SQLite + Drizzle ORM
- React Hook Form + Zod
- node-ical for calendar parsing

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Run DB migrations + seed defaults:
   ```bash
   npm run db:migrate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

## Useful Commands

- Generate migrations: `npm run db:generate`
- Apply migrations + seed admin/settings: `npm run db:migrate`
- Manual game sync from ICS: `npm run sync:games`

## Default Admin Login

- Username: value of `ADMIN_USERNAME` (`admin` by default)
- Password: value of `ADMIN_PASSWORD` (`admin1234` by default)

Admin pages:
- `/admin/login`
- `/admin`

## API Overview

- `GET /api/games` - list all games with fika signups.
- `GET /api/parents` - list parent names available for signup.
- `POST /api/signups` - sign up for fika (`gameId`, `parentId`, `pin`).
- `DELETE /api/signups` - remove signup (`gameId`, `parentId`, `pin`).
- `POST /api/sync` - manual sync (public endpoint).
- `POST /api/cron/sync` - protected cron sync (`x-cron-token` header).

Admin endpoints (require admin session):
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET|POST|DELETE /api/admin/parents`
- `GET|POST /api/admin/settings`
- `POST /api/admin/sync`

## Cron Sync

Set `CRON_SECRET` and call:

```bash
curl -X POST http://localhost:3000/api/cron/sync \
  -H "x-cron-token: $CRON_SECRET"
```
