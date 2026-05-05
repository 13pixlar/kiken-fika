# PROJECT_DESC.md — Kiken / Utsikten P15 Akademi

Companion document for **future agents**: what this codebase is, how it hangs together, where to edit things, and operational notes. Intended as a briefing; read code for exact behavior.

---

## What this project is

**Sports team web app for “Utsikten P15 Akademi” (football/soccer cohort).**

- **Public home page:** Lists synced **matches** from a team ICS calendar on Laget.se. For **home games only**, parents can volunteer for **fika (snack stall) duties** (“ansvariga för fika”).
- **Admin:** Session-protected `/admin` to manage **calendar URL**, **home team name** (used when classifying Hemma/Borta), and **parents** CRUD used historically; **signup from the site is largely self‑service** (name + PIN creates or matches a `parents` row—see [Fika signups](#fika-signups)).

Copy and UI are **Swedish** (`lang="sv"` on `<html>`).

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 16** (App Router), **React 19** |
| Build | `next dev/build --webpack` (see `package.json`) |
| DB | **SQLite** via **libsql** (`@libsql/client`) + **Drizzle ORM** |
| Auth (admin) | **iron-session** cookie (`kiken-admin-session`), password checked with **bcryptjs** |
| User PINs (parents) | **bcryptjs** hashes in `parents.pinHash` |
| Calendar | **node-ical** — fetches remote `.ics` URL |
| Forms / validation | **react-hook-form**, **zod** (`@/src/lib/validators.ts`) |
| UI | **Tailwind CSS v4**, **shadcn**-style components under `components/ui/` |
| Dates | **date-fns** with `sv` locale where weekday/month names matter |

**Path alias:** `@/*` → repo root (see `tsconfig.json`). Imports look like `@/src/...`, `@/components/...`, `@/lib/utils`.

**Project rules file:** `AGENTS.md` reminds that **Next.js 16 may differ** from older docs; check `node_modules/next/dist/docs/` when APIs are unclear.

---

## Repository layout (high signal)

```
app/                    # App Router: pages + route handlers
  layout.tsx            # Root layout, Geist fonts, Toaster
  page.tsx              # Public home (SSR games → HomePageClient)
  admin/                # Admin login + dashboard
  api/                  # REST-style route handlers

components/ui/         # shadcn primitives (Button, Card, Dialog, …)

src/
  components/           # Feature React components (home, admin, game list, signup)
  db/                   # client, schema, migrations, migrate script
  lib/                  # ics parsing, sync, settings, auth, validators, format helpers
  scripts/              # CLI sync

lib/utils.ts            # cn() (clsx + tailwind-merge)

data/                   # Default SQLite file path (see DATABASE_URL)
```

---

## Database model (Drizzle / SQLite)

Defined in `src/db/schema.ts`:

- **`games`** — One row per calendar event (match). Key field **`uid`** (ICS UID) for upsert. Fields include `title`, `location`, `startsAt`, `endsAt`, `isHomeGame`, `rawSummary`.
- **`parents`** — Volunteer identity: **`name` is unique**, **`pinHash`** for 4-digit PIN. Created by admin and/or **created on first successful public signup** when the name is new.
- **`fika_signups`** — Join table: which `parent` signed up for which `game`. **Max 2 signups per home game** (`MAX_SIGNUPS_PER_HOME_GAME` in `src/lib/constants.ts`). Unique on `(gameId, parentId)`.
- **`app_settings`** — Key/value store: `calendarUrl`, `homeTeamName` (defaults in `src/lib/constants.ts` + `ensureDefaultSettings()` in `src/lib/settings.ts`).
- **`admin_users`** — Admin login credentials (hashed password).

DB file: `DATABASE_URL` env or default `./data/app.db` (`src/db/client.ts` creates parent directory if needed).

Migrations: `npm run db:generate` / `npm run db:migrate` (Drizzle).

---

## Calendar → games pipeline

1. **`parseGamesFromCalendar(url, homeTeamName)`** (`src/lib/ics.ts`)  
   - Fetches ICS (supports `webcal://` → `https://`).  
   - Filters **VEVENT** entries that look like **matches** (keywords / `vs` / `-` patterns); **excludes** training-like summaries (`träning`, `training`, etc.).  
   - **`isHomeGame`**: compares **left side of title** (before `-` / `vs`) to configured **home team name** (normalized).  
   - Returns sorted `ParsedGame[]`.

2. **`syncGamesFromCalendar()`** (`src/lib/game-sync.ts`)  
   - Reads config via `getAppConfig()`.  
   - **Upserts** each game on **`games.uid`**.  
   - **Deletes** DB games whose `uid` is no longer present in the latest calendar parse (“stale” cleanup when `parsedGames.length > 0`).

**Triggers:**

- **`GET /api/games`**: If **no games with `startsAt` in the future**, runs sync once before returning (lazy bootstrap).
- **`POST /api/sync`**: Public “Uppdatera kalender” button (see `HomePageClient`).
- **`POST /api/cron/sync`**: Cron-style; requires header **`x-cron-token`** matching **`CRON_SECRET`**.
- **CLI:** `npm run sync:games` → `src/scripts/sync-games.ts`.

---

## Public app (`/`)

- **Server:** `app/page.tsx` loads games + signups (with parent names), maps to `GameRow` shape, applies **`formatVenueForDisplay`** on `location` for SSR consistency.
- **Client:** `HomePageClient` — hero, sync button, **`GameList`**.
- **`GameList`** (`src/components/game-list.tsx`):  
  - Grid of cards; **Hemma/Borta** label, centered header, compact datetime (`formatCompactGameDateTime` — e.g. `Sön 20/9 kl 14:30`), **venue** via `formatVenueForDisplay` (strips `(...)` including nested).  
  - Corner **date tag**: `formatCornerDayMonth` (e.g. `9 Sep`) with Swedish `MMM` + capitalized month.  
  - Home games: signup list + **`SignupDialog`** + **`n/2 ansvariga`** line with optional check icon when ≥1 signup.  
  - **Team display mapping:** `TEAM_NAME_MAPPINGS` can rewrite calendar strings (e.g. display rename).

---

## Fika signups

**Component:** `src/components/signup-dialog.tsx`.

**Payload / validation:** `signupSchema` in `src/lib/validators.ts`: `gameId`, `parentName` (trim, min/max length), `pin` (`pinSchema`: exactly 4 digits).

**API:** `POST/DELETE /api/signups`

- Validates game exists, **`isHomeGame`**, **`startsAt` in the future** (POST).
- **`parentName` lookup by exact stored name.** If no row: **insert** parent with **bcrypt-hashed PIN**. On unique race: re-fetch and enforce **same PIN** as existing row with that name.
- If parent exists: **PIN must match** stored hash (includes admin-precreated parents).
- Enforces max 2 volunteers; duplicate signup same parent blocked.

**DELETE:** Finds parent by name, verifies PIN, removes signup row.

---

## Admin app

- **`/admin/login`** → `POST /api/admin/login` uses `ensureAdminUser()` + **`verifyAdminCredentials`**. Seeds first admin from **`ADMIN_USERNAME`** / **`ADMIN_PASSWORD`** env (defaults **`admin`** / **`admin1234`** — change in production).
- **Session:** `src/lib/auth.ts` — **`SESSION_PASSWORD`** for iron-session (has insecure dev default string if unset — **must set in production**).
- **`/admin`** (server): redirects if no session; passes parents list + **`getAppConfig()`** into **`AdminPageClient`** — settings form, sync, logout, parent list management via **`/api/admin/*`**.

---

## HTTP API summary

| Route | Role |
|--------|------|
| `GET /api/games` | Games + signups JSON; may trigger initial sync; locations **formatted** (no parentheticals) |
| `GET /api/parents` | Public list of parent id+name (still available; home flow no longer depends on it) |
| `POST /api/sync` | Full calendar sync (public) |
| `POST /api/signups` | Create fika signup |
| `DELETE /api/signups` | Remove signup |
| `POST /api/cron/sync` | Secured cron sync |
| `POST /api/admin/login` | Admin session |
| `POST /api/admin/logout` | Clear session |
| `GET/POST /api/admin/settings` | Read/update app settings (protected) |
| `GET/POST/DELETE /api/admin/parents` | Parent CRUD (protected) |
| `GET/POST /api/admin/sync` | Admin-triggered sync (protected) |
| `GET /api/admin/session` | Session probe |

*(Exact behavior: read each `route.ts`.)*

---

## Environment variables (checklist)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite path or `file:` URL (default `./data/app.db`) |
| `SESSION_PASSWORD` | iron-session encryption (required for secure prod) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First admin bootstrap / login |
| `CRON_SECRET` | Validates `x-cron-token` on `/api/cron/sync` |

---

## npm scripts

- `npm run dev` — Next dev (webpack)
- `npm run build` / `npm start` — Production
- `npm run lint` — ESLint
- `npm run db:generate` / `npm run db:migrate` — Drizzle migrations
- `npm run sync:games` — One-off CLI calendar sync

---

## Conventions useful for agents

1. **Swedish user-facing strings** unless explicitly English (e.g. cron error body).
2. **Don’t assume Next.js 14 patterns** — this is **Next 16**; verify App Router route handler signatures if unsure.
3. **Business constants** live in **`src/lib/constants.ts`** (`DEFAULT_CALENDAR_URL`, default home team name, max signups).
4. **Venue formatting** is centralized in **`src/lib/format-venue.ts`**; also applied when serializing games in **`app/page.tsx`** and **`app/api/games/route.ts`** so SSR and refresh match.
5. **PINs**: Always stored hashed; compare with `bcrypt.compare`, hash with `bcrypt.hash(..., 10)`.
6. **Styling**: Team-themed blues on public pages; home cards and hero use shared `rounded-xl` via `homeCardRadiusClass` in `src/components/home-corner-radius.tsx`.

---

## Product / stakeholder context

Built around **selling snacks (“fika”) at home matches** with a simple signup cap of **two parents per match**. Calendar source is intentionally **external (Laget.se ICS)** so match data stays in sync without manual entry. **Hemma vs borta** drives both card styling and whether signup UI appears.

---

*Last updated for agent onboarding; trim or extend as the product evolves.*
