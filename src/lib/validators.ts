import { z } from "zod";
import { FIKA_PLAYER_NAMES } from "./constants";

const fikaPlayerNameSet = new Set<string>(FIKA_PLAYER_NAMES);

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN måste bestå av exakt fyra siffror.");

/** Ny anmälan: endast namn från trupplistan. */
export const signupPostSchema = z.object({
  gameId: z.number().int().positive(),
  parentName: z
    .string()
    .trim()
    .refine((name) => fikaPlayerNameSet.has(name), "Välj ett namn från listan."),
  pin: pinSchema,
});

/** Ta bort anmälan: samma logik som tidigare så äldre rader (annat namn) fortfarande kan rensas. */
export const signupDeleteSchema = z.object({
  gameId: z.number().int().positive(),
  parentName: z.string().trim().min(2, "Namn måste innehålla minst två tecken.").max(120),
  pin: pinSchema,
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});

export const createParentSchema = z.object({
  name: z.string().min(2, "Namn måste innehålla minst två tecken."),
  pin: pinSchema,
});

export const settingSchema = z.object({
  homeTeamName: z.string().min(2),
  calendarUrl: z.url(),
});

export const adminDeleteFikaSignupSchema = z.object({
  signupId: z.number().int().positive(),
});
