const SVFF_SEARCH_URL = "https://aktiva.svenskfotboll.se/api/search/";
const SVFF_USER_AGENT =
  "Mozilla/5.0 (compatible; Kiken/1.0; +https://github.com/) AppleWebKit/537.36";

type SvffClubItem = {
  img?: { src?: string };
};

type SvffSearchResponse = {
  clubs?: { items?: SvffClubItem[] };
};

function extractBadgeUrlFromParsed(data: SvffSearchResponse): string | null {
  const items = data.clubs?.items;
  if (!items?.length) {
    return null;
  }
  for (const club of items) {
    const src = club.img?.src;
    if (typeof src === "string" && src.length > 0) {
      return src;
    }
  }
  return null;
}

/** Regex aligned with legacy RefBase PHP fallback. */
function extractBadgeUrlFromRawText(raw: string): string | null {
  const match = raw.match(/"img":\s*{\s*"src":\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

/**
 * Resolves a club emblem image URL from SvFF “aktiva” search (same contract as RefBase PHP).
 */
export async function fetchSvenskFotbollBadgeUrl(teamName: string): Promise<string | null> {
  const q = teamName.trim();
  if (!q) {
    return null;
  }

  const url = new URL(SVFF_SEARCH_URL);
  url.searchParams.set("q", q);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": SVFF_USER_AGENT,
      },
      body: JSON.stringify({ clubTake: 1 }),
      next: { revalidate: 0 },
    });
  } catch {
    return null;
  }

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return null;
  }

  let parsed: SvffSearchResponse | undefined;
  try {
    parsed = JSON.parse(raw) as SvffSearchResponse;
  } catch {
    parsed = undefined;
  }

  const fromJson = parsed ? extractBadgeUrlFromParsed(parsed) : null;
  return fromJson ?? extractBadgeUrlFromRawText(raw);
}

export const BADGE_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
