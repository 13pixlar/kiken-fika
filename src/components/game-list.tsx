"use client";

import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarDays, Check, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { homeCardRadiusClass } from "@/src/components/home-corner-radius";
import { SignupDialog } from "@/src/components/signup-dialog";
import { TeamBadge } from "@/src/components/team-badge";
import { MAX_SIGNUPS_PER_HOME_GAME } from "@/src/lib/constants";
import { formatVenueForDisplay } from "@/src/lib/format-venue";
import { formatSekInteger } from "@/src/lib/format-sek";
import type { GameRow } from "@/src/lib/types";

type GameListProps = {
  games: GameRow[];
  onRefresh: () => Promise<void>;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center py-8">
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20"
        aria-hidden
      />
      <h2 className="relative mx-auto bg-[#0b2c52] px-6 text-center text-base font-normal tracking-tight text-white sm:px-8">
        {children}
      </h2>
    </div>
  );
}

const TEAM_NAME_MAPPINGS: Array<{ from: RegExp; to: string }> = [
  { from: /\bUtsiktens BK 1\b/gi, to: "Utsiktens BK" },
  { from: /\bUngdom P2011 Svart\b/gi, to: "" },
  { from: /\bKF Velebit 2011\b/gi, to: "" },
  { from: /\bP11\s+1\b/gi, to: "" },
  { from: /\bP2011\b/gi, to: "" },
  { from: /\s*Blå\s*/gi, to: " " },
  { from: /\bAkademi\b/gi, to: "" },
  { from: /\bSvart\b/gi, to: "" },
];

const toDisplayTeamName = (value: string) =>
  TEAM_NAME_MAPPINGS.reduce((result, mapping) => result.replace(mapping.from, mapping.to), value);

const fixtureTitle = (title: string) =>
  toDisplayTeamName(
    title
      .replace(/^\s*match\s+/i, "")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/\s+/g, " ")
    .trim();

const splitFixture = (title: string) => {
  const cleaned = fixtureTitle(title);
  const [home, away] = cleaned.split(/\s-\s|\sVS\s|\svs\s/);
  if (!home || !away) {
    return { home: cleaned, away: null };
  }
  return { home: home.trim(), away: away.trim() };
};

function formatCornerDayMonth(date: Date) {
  const raw = format(date, "d MMM", { locale: sv });
  const [day, ...monthParts] = raw.split(/\s+/);
  const month = monthParts.join(" ");
  if (!day || !month) {
    return raw;
  }
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

/** e.g. "Sön 20/9 kl 14:30" */
function formatCompactGameDateTime(date: Date) {
  const weekdayRaw = format(date, "EEE", { locale: sv }).replace(/\.$/, "");
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const dayMonth = format(date, "d/M");
  const time = format(date, "HH:mm");
  return `${weekday} ${dayMonth} kl ${time}`;
}

const FIKA_FOOD_EMOJIS = ["🥯", "🍪", "🥐", "🍰", "🧺", "🍩", "🥨"] as const;

function scrambleU32(seed: number): number {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

/** Deterministiska ”slump”-val så SSR och klient matchar; ändras när match eller anmälningar ändras. */
function fikaCornerEmojiCluster(game: GameRow): string | null {
  if (!game.isHomeGame || game.signups.length === 0) {
    return null;
  }
  const extraCount = game.signups.length >= 2 ? 3 : 1;
  const signupKey = [...game.signups.map((s) => s.id)].sort((a, b) => a - b).join(",");
  let state = 2166136261;
  const key = `${game.id}:${signupKey}:${game.signups.length}`;
  for (let i = 0; i < key.length; i++) state = Math.imul(state ^ key.charCodeAt(i), 16777619) >>> 0;

  const order = FIKA_FOOD_EMOJIS.map((_, i) => i);
  let s = state;
  for (let i = order.length - 1; i > 0; i--) {
    s = scrambleU32(s + i * 2654435761);
    const j = s % (i + 1);
    const t = order[i];
    order[i] = order[j]!;
    order[j] = t!;
  }

  let cluster = "☕";
  for (let i = 0; i < extraCount; i++) {
    cluster += FIKA_FOOD_EMOJIS[order[i]!];
  }
  return cluster;
}

function formatAnsvarigaNames(names: string[]): string {
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} och ${names[1]}`;
  }
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");
  return `${rest} och ${last}`;
}

function ansvarigaLabel(game: GameRow) {
  const count = game.signups.length;
  const max = MAX_SIGNUPS_PER_HOME_GAME;
  const text = `Anmälda (${count}/${max})`;
  return { text, showCheck: count >= 1 };
}

function splitUpcomingAndPast(games: GameRow[], nowMs: number) {
  const byStart = [...games].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const upcoming = byStart.filter((g) => new Date(g.startsAt).getTime() >= nowMs);
  const past = byStart
    .filter((g) => new Date(g.startsAt).getTime() < nowMs)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return { upcoming, past };
}

function GameCard({
  game,
  onRefresh,
  isPast = false,
}: {
  game: GameRow;
  onRefresh: () => Promise<void>;
  isPast?: boolean;
}) {
  const ansvariga = ansvarigaLabel(game);
  const startsAt = new Date(game.startsAt);
  const topDateLabel = formatCornerDayMonth(startsAt);
  const fixture = splitFixture(game.title);
  const venueDisplay = formatVenueForDisplay(game.location);
  const fikaEmoji = fikaCornerEmojiCluster(game);
  const homeCardStyle = game.isHomeGame
    ? "border-[#4f90d7] bg-[#18497c] text-white"
    : "border-[#2a4d73] bg-[#0f2f57] text-blue-100 opacity-80";
  return (
    <Card
      className={cn(
        "relative h-full gap-4 py-5 shadow-md",
        homeCardStyle,
        homeCardRadiusClass,
      )}
    >
      {fikaEmoji ? (
        <div
          className="pointer-events-none absolute left-0 top-0 pt-1.5 pl-0.5 pr-2 pb-2 text-xl leading-none sm:left-1 sm:pt-2 sm:pl-1 sm:text-2xl sm:pb-2"
          aria-hidden
        >
          {fikaEmoji}
        </div>
      ) : null}
      <div
        className={cn(
          "pointer-events-none absolute -mt-px top-0 right-4 border border-white/20 bg-[#2f79d0] px-3.5 py-1 text-sm font-semibold tracking-wide text-white",
          "rounded-b-md",
        )}
      >
        {topDateLabel}
      </div>
      <CardHeader className="!flex flex-col items-center space-y-0 px-4 pt-5 pb-0 text-center sm:px-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/80">
          {game.isHomeGame ? "Hemma" : "Borta"}
        </p>
        <div className="w-full space-y-3">
          <CardTitle className="flex w-full max-w-full justify-center text-base leading-tight">
            {fixture.away ? (
              <span className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 sm:gap-x-4">
                <span className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <TeamBadge key={fixture.home} teamName={fixture.home} />
                  <span className="break-words font-semibold leading-tight">
                    {fixture.home}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 bg-black/20 px-1.5 py-0.5 text-[10px] tracking-wider",
                    "rounded-sm",
                  )}
                >
                  VS
                </span>
                <span className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <TeamBadge key={fixture.away} teamName={fixture.away} />
                  <span className="break-words font-semibold leading-tight">
                    {fixture.away}
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1 text-center">
                <TeamBadge key={fixture.home} teamName={fixture.home} />
                <span className="font-semibold leading-tight">{fixture.home}</span>
              </span>
            )}
          </CardTitle>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-blue-100/90">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatCompactGameDateTime(startsAt)}
            </span>
            {venueDisplay ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {venueDisplay}
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {game.isHomeGame ? (
        <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-2 sm:px-5">
          <div
            className={cn(
              "border border-white/15 bg-[#113c68] p-3 text-xs sm:p-4",
              "rounded-md",
            )}
          >
            <p className="mb-2 font-medium text-blue-100">Ansvariga för fika</p>
            {game.signups.length === 0 ? (
              <p className="text-blue-200">Inga anmälningar ännu.</p>
            ) : (
              <p className="text-blue-50 leading-snug">
                {formatAnsvarigaNames(game.signups.map((s) => s.parentName))}
              </p>
            )}
            {isPast ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                {game.fikaSalesSek != null ? (
                  <p className="text-sm font-semibold text-emerald-200">
                    Sålt för {formatSekInteger(game.fikaSalesSek)}
                  </p>
                ) : (
                  <p className="text-xs text-blue-200/80">Försäljningsbelopp inte inlagt ännu.</p>
                )}
              </div>
            ) : null}
          </div>
          <div
            className={`mt-auto flex flex-wrap items-end gap-4 pt-5 ${isPast ? "justify-end" : "justify-between"}`}
          >
            {!isPast ? (
              <SignupDialog
                game={game}
                signupFull={game.signups.length >= MAX_SIGNUPS_PER_HOME_GAME}
                onDone={onRefresh}
              />
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-100">
              {ansvariga.showCheck ? (
                <Check className="size-3.5 shrink-0 text-emerald-300" aria-hidden />
              ) : null}
              {ansvariga.text}
            </span>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function GameCardGrid({
  games,
  onRefresh,
  isPastSection = false,
}: {
  games: GameRow[];
  onRefresh: () => Promise<void>;
  isPastSection?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onRefresh={onRefresh}
          isPast={isPastSection}
        />
      ))}
    </div>
  );
}

export function GameList({ games, onRefresh }: GameListProps) {
  const { upcoming, past } = useMemo(() => {
    if (games.length === 0) {
      return { upcoming: [] as GameRow[], past: [] as GameRow[] };
    }
    // Wall clock: classify matches relative to "now" when games data is current.
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for upcoming vs past
    const nowMs = Date.now();
    return splitUpcomingAndPast(games, nowMs);
  }, [games]);

  if (games.length === 0) {
    return (
      <div
        className={cn(
          "border border-white/15 bg-[#11345f] p-5 text-sm text-blue-100 sm:p-6",
          homeCardRadiusClass,
        )}
      >
        Inga matcher på valt datum.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {upcoming.length > 0 ? (
        <section className="flex flex-col gap-8" aria-label="Kommande matcher">
          <SectionHeading>Kommande matcher</SectionHeading>
          <GameCardGrid games={upcoming} onRefresh={onRefresh} />
        </section>
      ) : null}
      {past.length > 0 ? (
        <section className="flex flex-col gap-8" aria-label="Tidigare matcher">
          <SectionHeading>Tidigare matcher</SectionHeading>
          <GameCardGrid games={past} onRefresh={onRefresh} isPastSection />
        </section>
      ) : null}
    </div>
  );
}
