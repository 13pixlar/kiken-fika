import { inArray } from "drizzle-orm";
import { db } from "@/src/db/client";
import { appSettings } from "@/src/db/schema";
import { DEFAULT_CALENDAR_URL, DEFAULT_HOME_TEAM_NAME } from "@/src/lib/constants";

export type AppConfig = {
  calendarUrl: string;
  homeTeamName: string;
};

const CALENDAR_URL_KEY = "calendarUrl";
const HOME_TEAM_NAME_KEY = "homeTeamName";

export async function ensureDefaultSettings() {
  const existing = await db.select().from(appSettings);
  if (existing.length > 0) {
    return;
  }

  const now = new Date();
  await db.insert(appSettings).values([
    { key: CALENDAR_URL_KEY, value: DEFAULT_CALENDAR_URL, updatedAt: now },
    { key: HOME_TEAM_NAME_KEY, value: DEFAULT_HOME_TEAM_NAME, updatedAt: now },
  ]);
}

export async function getAppConfig(): Promise<AppConfig> {
  await ensureDefaultSettings();
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, [CALENDAR_URL_KEY, HOME_TEAM_NAME_KEY]));

  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return {
    calendarUrl: byKey.get(CALENDAR_URL_KEY) ?? DEFAULT_CALENDAR_URL,
    homeTeamName: byKey.get(HOME_TEAM_NAME_KEY) ?? DEFAULT_HOME_TEAM_NAME,
  };
}

export async function upsertConfig(config: AppConfig) {
  const now = new Date();
  await db
    .insert(appSettings)
    .values({ key: CALENDAR_URL_KEY, value: config.calendarUrl, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: config.calendarUrl,
        updatedAt: now,
      },
    });

  await db
    .insert(appSettings)
    .values({ key: HOME_TEAM_NAME_KEY, value: config.homeTeamName, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: config.homeTeamName, updatedAt: now },
    });
}
