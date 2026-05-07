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

export const adminCreateFikaSignupSchema = z
  .object({
    gameId: z.number().int().positive(),
    parentId: z.number().int().positive().optional(),
    parentName: z.string().trim().optional(),
    bypassSignupLimit: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasId = data.parentId != null;
    const nameTrimmed = data.parentName?.trim() ?? "";
    const hasName = nameTrimmed.length > 0;
    if (hasId === hasName) {
      ctx.addIssue({
        code: "custom",
        message: "Skicka antingen parentId eller parentName (barnets namn från trupplistan).",
      });
      return;
    }
    if (hasName && !fikaPlayerNameSet.has(nameTrimmed)) {
      ctx.addIssue({
        code: "custom",
        message: "Välj ett namn från trupplistan.",
      });
    }
  });

/** Admin uppdatering av försäljningssumma per match (hela kronor SEK). */
export const adminPatchGameFikaSalesSchema = z.object({
  fikaSalesSek: z.union([
    z
      .number()
      .int("Belopp måste vara ett heltal.")
      .min(0, "Belopp kan inte vara negativt.")
      .max(9_999_999, "Beloppet är för stort."),
    z.null(),
  ]),
});

export const adminCreateAdminSchema = z.object({
  username: z.string().trim().min(3, "Användarnamnet måste vara minst tre tecken.").max(64),
  password: z.string().min(6, "Lösenordet måste vara minst sex tecken."),
});

export const adminPatchMeSchema = z
  .object({
    currentPassword: z.string().min(1, "Ange nuvarande lösenord."),
    newUsername: z.string().trim().max(64).optional(),
    newPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const usernameTrimmed = data.newUsername?.trim() ?? "";
    const hasUsernameChange = usernameTrimmed.length > 0;
    const passwordRaw = data.newPassword ?? "";
    const hasPasswordChange = passwordRaw.length > 0;

    if (!hasUsernameChange && !hasPasswordChange) {
      ctx.addIssue({
        code: "custom",
        message: "Ange nytt användarnamn eller nytt lösenord.",
        path: ["newPassword"],
      });
    }
    if (hasUsernameChange && usernameTrimmed.length < 3) {
      ctx.addIssue({
        code: "custom",
        message: "Nytt användarnamn måste vara minst tre tecken.",
        path: ["newUsername"],
      });
    }
    if (hasPasswordChange && passwordRaw.length < 6) {
      ctx.addIssue({
        code: "custom",
        message: "Nytt lösenord måste vara minst sex tecken.",
        path: ["newPassword"],
      });
    }
  });
