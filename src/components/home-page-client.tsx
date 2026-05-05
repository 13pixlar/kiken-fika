"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { CalendarDays, ChartColumnIncreasing, CircleHelp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { homeCardRadiusClass } from "@/src/components/home-corner-radius";
import { GameList } from "@/src/components/game-list";
import type { GameRow } from "@/src/lib/types";

type HomePageClientProps = {
  initialGames: GameRow[];
};

type HomeSection = "matcher" | "statistik" | "hur";

const NAV_ITEMS: { id: HomeSection; label: string; Icon: LucideIcon }[] = [
  { id: "matcher", label: "Matcher", Icon: CalendarDays },
  { id: "hur", label: "Hur gör man", Icon: CircleHelp },
  { id: "statistik", label: "Statistik", Icon: ChartColumnIncreasing },
];

function computeFikaStats(games: GameRow[]) {
  const counts = new Map<string, number>();
  for (const game of games) {
    if (!game.isHomeGame) continue;
    for (const signup of game.signups) {
      counts.set(signup.parentName, (counts.get(signup.parentName) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv"))
    .map(([name, count]) => ({ name, count }));
}

function AlternatePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border border-white/15 bg-[#11345f] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8",
        homeCardRadiusClass,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function HomePageClient({ initialGames }: HomePageClientProps) {
  const [games, setGames] = useState<GameRow[]>(initialGames);
  const [section, setSection] = useState<HomeSection>("matcher");

  const fikaStats = useMemo(() => computeFikaStats(games), [games]);

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (raw === "matcher" || raw === "statistik" || raw === "hur") {
      setSection(raw);
    }
  }, []);

  const refreshData = async () => {
    const gamesRes = await fetch("/api/games", { cache: "no-store" });
    const gamesJson = await gamesRes.json();

    if (!gamesRes.ok) {
      throw new Error(gamesJson.error ?? "Kunde inte hämta matcher.");
    }

    setGames(gamesJson.games ?? []);
  };

  return (
    <main className="min-h-screen bg-[#0b2c52]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <header className={cn("border border-white/10 bg-[#174a7e] text-white shadow-xl", homeCardRadiusClass)}>
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-blue-100">
                  Utsikten P15 Fika
                </p>
                <h1 className="text-3xl font-semibold">Matcher och fikaförsäljning</h1>
                <p className="mt-2 max-w-2xl text-blue-100">
                  Här ser du Kiken P15:s alla matcher. På hemmamatcher kan föräldrar till två
                  spelare anmäla sig till fikaförsäljning med namn och en egen fyrsiffrig PIN.
                </p>
              </div>
              <Image
                src="/ubk-logo.png"
                alt="Utsikten BK klubbmärke"
                width={96}
                height={96}
                className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
              />
            </div>

            <nav
              aria-label="Huvudmeny"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-5 sm:gap-x-10"
            >
              {NAV_ITEMS.map(({ id, label, Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setSection(id);
                    window.history.replaceState(null, "", `#${id}`);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm transition-colors no-underline",
                    section === id
                      ? "font-semibold text-white"
                      : "text-sky-200/95 hover:text-white",
                  )}
                  aria-current={section === id ? "page" : undefined}
                >
                  <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        {section === "matcher" ? (
          <GameList games={games} onRefresh={refreshData} />
        ) : section === "statistik" ? (
          <AlternatePanel>
            <h2 className="text-lg font-semibold text-white">Statistik — fikaansvar</h2>
            <p className="mt-2 text-sm text-blue-100/95">
              Antal hemmamatcher varje registrerade spelare har varit eller är anmäld som ansvarig
              för fika (enligt listan nedan på sidan när du visar Matcher).
            </p>
            {fikaStats.length === 0 ? (
              <p className="mt-6 text-sm text-blue-100/90">
                Här visas hur många hemmamatcher varje spelare har haft eller har fikaansvaret. När
                det finns anmälningar visas de här — synka gärna i admin om listan inte stämmer.
              </p>
            ) : (
              <ul className="mt-6 max-w-lg divide-y divide-white/12 border border-white/15 bg-[#0f3559]">
                {fikaStats.map(({ name, count }) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-white">{name}</span>
                    <span className="tabular-nums text-blue-50">
                      {count} {count === 1 ? "match" : "matcher"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AlternatePanel>
        ) : (
          <AlternatePanel>
            <h2 className="text-lg font-semibold text-white">Hur gör man — fika på hemmamatch</h2>
            <div className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-blue-50">
              <p>
                Vi föräldrar hjälps åt att sälja fika på hemmamatcher. Allt som säljs går oavkortat
                till <strong className="text-white">lagkassan</strong> och bidrar till resor,
                material och det som laget behöver under säsongen. Tack för att du ställer upp!
              </p>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                  Kaffe
                </h3>
                <p>
                  Koka gärna kaffe hemma och fyll en{" "}
                  <strong className="text-white">termos</strong> så att det räcker en stund. Fyll på
                  med varmt vatten om det finns i klubbhuset, eller ta med två termosar om det blir
                  mycket folk. Märk gärna termosen så den hittas lätt bakom båset.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                  Fikabröd
                </h3>
                <p>
                  <strong className="text-white">Baka en kaka</strong>, muffins eller scones –
                  eller <strong className="text-white">köp något färdigt</strong> om tiden är knapp.
                  Ett enkelt bröd och något sött brukar gå hem. Tänk på att ha något som går att äta
                  med handen utan bestick.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                  Tillbehör
                </h3>
                <p>
                  Ta gärna med <strong className="text-white">servetter</strong>,{" "}
                  <strong className="text-white">mjölk</strong> (eller havre) till kaffet och{" "}
                  <strong className="text-white">pappersmuggar</strong> så att allt går smidigt även när det
                  är mycket folk. Ett litet paket sugrör kan vara bra om det finns barn i kön.
                </p>
              </div>
              <p className="border-t border-white/15 pt-5 text-xs text-blue-100/85">
                Kom i god tid före matchstart, ställ fram det ni har med er och håll lite koll på
                kassan och påfyllning. Vid frågor – fråga lagledaren eller någon som haft fika
                senast.
              </p>
            </div>
          </AlternatePanel>
        )}
      </div>
    </main>
  );
}
