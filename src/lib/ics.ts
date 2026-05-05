import { DEFAULT_CALENDAR_URL } from "@/src/lib/constants";

export type ParsedGame = {
  uid: string;
  title: string;
  rawSummary: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  isHomeGame: boolean;
};

type CalendarGameEntry = {
  type: string;
  uid: string;
  start: string | Date;
  end?: string | Date;
  summary: string;
  location?: string;
};

const normalizeCalendarUrl = (url: string) =>
  url.replace(/^webcal:\/\//i, "https://");

const TRAINING_KEYWORDS = ["träning", "traning", "training", "fys", "gym"];

const cleanupSummaryPrefix = (value: string) =>
  value
    .replace(/^\s*match\s+/i, "")
    .replace(/^\s*serie\s+/i, "")
    .replace(/^\s*sammandrag\s+/i, "")
    .trim();

const normalizeTeamName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const isGameSummary = (summary: string) => {
  const normalized = summary.toLowerCase();
  if (TRAINING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return /\bmatch\b/i.test(summary) || /\bvs\b/i.test(summary) || /\s-\s/.test(summary);
};

const inferHomeGame = (summary: string, homeTeamName: string) => {
  const normalizedTeam = normalizeTeamName(homeTeamName);
  const singularizedTeam = normalizedTeam.replace(/\b([a-zåäö]+)s\b/gi, "$1");
  const normalizedSummary = cleanupSummaryPrefix(summary.toLowerCase());
  const [leftSide] = normalizedSummary.split(/\s(?:-|vs)\s/i);
  const firstTeam = normalizeTeamName(leftSide?.trim() ?? normalizedSummary);

  return (
    firstTeam.includes(normalizedTeam) ||
    firstTeam.includes(singularizedTeam) ||
    normalizedTeam.includes(firstTeam)
  );
};

const isGameEntry = (entry: unknown): entry is CalendarGameEntry => {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const candidate = entry as Partial<CalendarGameEntry>;
  return (
    candidate.type === "VEVENT" &&
    typeof candidate.uid === "string" &&
    Boolean(candidate.start) &&
    typeof candidate.summary === "string"
  );
};

export async function parseGamesFromCalendar(
  calendarUrl: string = DEFAULT_CALENDAR_URL,
  homeTeamName: string,
): Promise<ParsedGame[]> {
  const nodeIcal = await import("node-ical");
  const ical = (("default" in nodeIcal ? nodeIcal.default : nodeIcal) as typeof import("node-ical"));
  const normalizedUrl = normalizeCalendarUrl(calendarUrl);
  const events = await ical.async.fromURL(normalizedUrl);
  const parsed: ParsedGame[] = [];

  for (const rawEntry of Object.values(events)) {
    if (!isGameEntry(rawEntry)) {
      continue;
    }

    const summary = String(rawEntry.summary);
    if (!isGameSummary(summary)) {
      continue;
    }

    parsed.push({
      uid: String(rawEntry.uid),
      title: summary,
      rawSummary: summary,
      location: rawEntry.location ? String(rawEntry.location) : null,
      startsAt: new Date(rawEntry.start),
      endsAt: rawEntry.end ? new Date(rawEntry.end) : null,
      isHomeGame: inferHomeGame(summary, homeTeamName),
    });
  }

  return parsed.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
