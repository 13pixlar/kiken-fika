"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Coffee, Settings, Shield, Users, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useHasMounted } from "@/src/hooks/use-has-mounted";
import type { AppConfig } from "@/src/lib/settings";
import { MAX_SIGNUPS_PER_HOME_GAME, FIKA_PLAYER_NAMES } from "@/src/lib/constants";
import type { AdminGameRow, AdminParentRow, AdminPublicRow } from "@/src/lib/types";

type AdminNavSectionId = "settings" | "admins" | "fika" | "parents";

const ADMIN_NAV_ITEMS: { id: AdminNavSectionId; label: string; Icon: LucideIcon }[] = [
  { id: "settings", label: "Inställningar", Icon: Settings },
  { id: "admins", label: "Administratörer", Icon: Shield },
  { id: "fika", label: "Intjänade pengar", Icon: Coffee },
  { id: "parents", label: "Anmälningar", Icon: Users },
];

function isAdminNavSectionId(raw: string): raw is AdminNavSectionId {
  return ADMIN_NAV_ITEMS.some((item) => item.id === raw);
}

function formatAdminMatchWhen(iso: string) {
  const d = new Date(iso);
  const weekdayRaw = format(d, "EEE", { locale: sv }).replace(/\.$/, "");
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const stamp = format(d, "d/M/yyyy HH:mm", { locale: sv });
  return `${weekday} ${stamp}`;
}

function formatAdminCreatedLabel(iso: string) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return iso;
  }
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function AdminGameCard({
  game,
  onRemoveSignup,
  onRefresh,
}: {
  game: AdminGameRow;
  onRemoveSignup: (signupId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [parentPick, setParentPick] = useState("");
  const [bypassCap, setBypassCap] = useState(false);
  const [addingSignup, setAddingSignup] = useState(false);
  const [fikaDraft, setFikaDraft] = useState("");
  const [savingSales, setSavingSales] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setFikaDraft(game.fikaSalesSek == null ? "" : String(game.fikaSalesSek));
    });
  }, [game.id, game.fikaSalesSek]);

  const signedNames = new Set(game.signups.map((s) => s.parentName));
  const availablePlayerNames = FIKA_PLAYER_NAMES.filter((name) => !signedNames.has(name));

  const addSignup = async () => {
    const parentName = parentPick.trim();
    if (!parentName) {
      toast.error("Välj ett barnnamn i listan.");
      return;
    }
    setAddingSignup(true);
    try {
      const response = await fetch("/api/admin/fika-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          parentName,
          bypassSignupLimit: bypassCap,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte lägga till anmälan.");
        return;
      }
      toast.success(
        typeof data.provisionalPin === "string"
          ? `Fika-anmälan tillagd. Ny föräldrad med tillfällig PIN: ${data.provisionalPin} (säg till föräldern).`
          : "Fika-anmälan tillagd.",
      );
      setParentPick("");
      setBypassCap(false);
      await onRefresh();
    } finally {
      setAddingSignup(false);
    }
  };

  const atCapacity =
    game.signups.length >= MAX_SIGNUPS_PER_HOME_GAME && !bypassCap;

  const saveFikaSales = async (sek: number | null) => {
    setSavingSales(true);
    try {
      const response = await fetch(`/api/admin/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fikaSalesSek: sek }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte spara belopp.");
        return;
      }
      toast.success(sek == null ? "Belopp rensat." : "Belopp sparat.");
      await onRefresh();
    } finally {
      setSavingSales(false);
    }
  };

  const commitSalesDraft = async () => {
    const trimmed = fikaDraft.trim();
    if (trimmed === "") {
      await saveFikaSales(null);
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Ange ett giltigt heltal (SEK) eller lämna tomt för att rensa.");
      return;
    }
    await saveFikaSales(n);
  };

  return (
    <div className="space-y-3 rounded-md border px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {formatAdminMatchWhen(game.startsAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{game.title}</p>
        {game.location ? (
          <p className="text-xs text-muted-foreground">{game.location}</p>
        ) : null}
      </div>

      <div className="border-t border-white/10 pt-3 space-y-2">
        <Label htmlFor={`fika-sek-${game.id}`}>Sålt för (SEK)</Label>
        <p className="text-xs text-muted-foreground">
          Hela kronor. Lämna tomt och spara för att rensa inlagt belopp.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={`fika-sek-${game.id}`}
            type="number"
            min={0}
            step={1}
            className="max-w-[160px]"
            value={fikaDraft}
            onChange={(event) => setFikaDraft(event.target.value)}
            placeholder="t.ex. 1250"
          />
          <Button type="button" variant="secondary" disabled={savingSales} onClick={commitSalesDraft}>
            {savingSales ? "Sparar…" : "Spara belopp"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={savingSales}
            onClick={() => saveFikaSales(null)}
          >
            Rensa
          </Button>
        </div>
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fikaansvariga ({game.signups.length})
        </p>
        {game.signups.length > 0 ? (
          <ul className="space-y-2">
            {game.signups.map((su) => (
              <li
                key={su.signupId}
                className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{su.parentName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onRemoveSignup(su.signupId)}
                >
                  Ta bort anmälan
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ingen anmälad ännu.</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor={`add-parent-${game.id}`}>Lägg till backfill / manuell anmälan</Label>
            <select
              id={`add-parent-${game.id}`}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={parentPick}
              onChange={(event) => setParentPick(event.target.value)}
            >
              <option value="">Välj barnets namn (trupp)…</option>
              {availablePlayerNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            disabled={
              addingSignup || !parentPick.trim() || atCapacity || availablePlayerNames.length === 0
            }
            onClick={addSignup}
            title={
              atCapacity ? "Fullt — kryssa i ”fler än två” för historisk backfill." : undefined
            }
          >
            {addingSignup ? "Lägger till…" : "Lägg till"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={bypassCap} onCheckedChange={setBypassCap} id={`bypass-${game.id}`} />
          <Label htmlFor={`bypass-${game.id}`} className="text-sm font-normal leading-snug">
            Tillåt fler än två anmälningar (historisk backfill)
          </Label>
        </div>
        {availablePlayerNames.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Alla spelare i trupplistan är redan anmälda till den här matchen (eller matchen är full utan
            backfill-rutan).
          </p>
        ) : null}
      </div>
    </div>
  );
}

type AdminPageClientProps = {
  initialParents: AdminParentRow[];
  initialSettings: AppConfig;
  initialGames: AdminGameRow[];
  initialAdmins: AdminPublicRow[];
  sessionUsername: string;
};

export function AdminPageClient({
  initialParents,
  initialSettings,
  initialGames,
  initialAdmins,
  sessionUsername,
}: AdminPageClientProps) {
  const router = useRouter();
  const [parents, setParents] = useState<AdminParentRow[]>(initialParents);
  const [games, setGames] = useState<AdminGameRow[]>(initialGames);
  const [settings, setSettings] = useState<AppConfig>(initialSettings);
  const [admins, setAdmins] = useState<AdminPublicRow[]>(initialAdmins);
  const [displayUsername, setDisplayUsername] = useState(sessionUsername);
  const [newParentName, setNewParentName] = useState("");
  const [newParentPin, setNewParentPin] = useState("");
  const [meCurrentPassword, setMeCurrentPassword] = useState("");
  const [meNewUsername, setMeNewUsername] = useState("");
  const [meNewPassword, setMeNewPassword] = useState("");
  const [meSaving, setMeSaving] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const authFormsMounted = useHasMounted();
  const [activeSection, setActiveSection] = useState<AdminNavSectionId>("settings");

  const scrollToAdminSection = (id: AdminNavSectionId) => {
    document.getElementById(`admin-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (isAdminNavSectionId(raw)) {
      queueMicrotask(() => {
        document.getElementById(`admin-section-${raw}`)?.scrollIntoView({ behavior: "auto", block: "start" });
        setActiveSection(raw);
      });
    }
  }, []);

  useEffect(() => {
    const elements = ADMIN_NAV_ITEMS.map((item) => document.getElementById(`admin-section-${item.id}`)).filter(
      (el): el is HTMLElement => el != null,
    );

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((entry) => entry.isIntersecting);
        if (intersecting.length === 0) {
          return;
        }
        const topMost = intersecting.reduce((best, entry) =>
          entry.boundingClientRect.top < best.boundingClientRect.top ? entry : best,
        );
        const rawId = topMost.target.id.replace(/^admin-section-/, "");
        if (isAdminNavSectionId(rawId)) {
          setActiveSection(rawId);
        }
      },
      { rootMargin: "-20% 0px -45% 0px", threshold: [0, 0.05, 0.25] },
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const refresh = async () => {
    const [parentsRes, settingsRes, gamesRes, adminsRes] = await Promise.all([
      fetch("/api/admin/parents", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/games", { cache: "no-store" }),
      fetch("/api/admin/admins", { cache: "no-store" }),
    ]);
    const parentsData = await parentsRes.json();
    const settingsData = await settingsRes.json();
    const gamesData = await gamesRes.json();
    setParents(parentsData.parents ?? []);
    setSettings({
      calendarUrl: settingsData.calendarUrl ?? settings.calendarUrl,
      homeTeamName: settingsData.homeTeamName ?? settings.homeTeamName,
    });
    setGames(gamesData.games ?? []);
    if (adminsRes.ok) {
      const adminsData = await adminsRes.json();
      setAdmins(adminsData.admins ?? []);
    }
  };

  const saveOwnAccount = async () => {
    setMeSaving(true);
    try {
      const body: { currentPassword: string; newUsername?: string; newPassword?: string } = {
        currentPassword: meCurrentPassword,
      };
      const trimmedUser = meNewUsername.trim();
      if (trimmedUser.length > 0) {
        body.newUsername = trimmedUser;
      }
      if (meNewPassword.length > 0) {
        body.newPassword = meNewPassword;
      }
      const response = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte spara kontouppgifter.");
        return;
      }
      toast.success("Kontot uppdaterat.");
      setMeCurrentPassword("");
      setMeNewUsername("");
      setMeNewPassword("");
      if (typeof data.username === "string") {
        setDisplayUsername(data.username);
      }
      router.refresh();
      await refresh();
    } finally {
      setMeSaving(false);
    }
  };

  const addAnotherAdmin = async () => {
    setAddingAdmin(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte skapa administratör.");
        return;
      }
      toast.success("Ny administratör skapad.");
      setNewAdminUsername("");
      setNewAdminPassword("");
      if (Array.isArray(data.admins)) {
        setAdmins(data.admins);
      } else {
        await refresh();
      }
      router.refresh();
    } finally {
      setAddingAdmin(false);
    }
  };

  const saveSettings = async () => {
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Kunde inte spara inställningar.");
      return;
    }
    toast.success("Inställningar sparade.");
  };

  const addParent = async () => {
    const response = await fetch("/api/admin/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newParentName, pin: newParentPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Kunde inte lägga till förälder.");
      return;
    }
    setNewParentName("");
    setNewParentPin("");
    toast.success("Förälder tillagd.");
    await refresh();
  };

  const removeFikaSignup = async (signupId: number) => {
    const response = await fetch("/api/admin/fika-signups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Kunde inte ta bort anmälan för match.");
      return;
    }
    toast.success("Anmälan borttagen för vald match.");
    await refresh();
  };

  const removeParent = async (parentId: number) => {
    const response = await fetch("/api/admin/parents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Kunde inte ta bort förälder.");
      return;
    }
    await refresh();
  };

  const runSync = async () => {
    const response = await fetch("/api/admin/sync", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Synk misslyckades.");
      return;
    }
    toast.success(`Synk klar: ${data.synced} matcher.`);
    await refresh();
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="sticky top-0 z-50 -mx-5 mb-2 rounded-xl border bg-background/95 px-5 py-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src="/ubk-logo.png"
                alt="Utsikten BK klubbmärke"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Kiken fika
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
              </div>
            </div>
            <Button variant="outline" className="shrink-0" onClick={logout}>
              Logga ut
            </Button>
          </div>

          <nav
            aria-label="Adminavdelningar"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-5 sm:gap-x-8"
          >
            {ADMIN_NAV_ITEMS.map(({ id, label, Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToAdminSection(id);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm transition-colors no-underline",
                  activeSection === id
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={activeSection === id ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <Card id="admin-section-settings" className="scroll-mt-44">
        <CardHeader>
          <CardTitle>Inställningar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="homeTeamName">Hemmateam</Label>
            <Input
              id="homeTeamName"
              value={settings.homeTeamName}
              onChange={(event) =>
                setSettings((previous) => ({ ...previous, homeTeamName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendarUrl">Kalender-URL</Label>
            <Input
              id="calendarUrl"
              value={settings.calendarUrl}
              onChange={(event) =>
                setSettings((previous) => ({ ...previous, calendarUrl: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={saveSettings}>Spara inställningar</Button>
            <Button variant="outline" onClick={runSync}>
              Kör synk nu
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="admin-section-admins" className="scroll-mt-44">
        <CardHeader>
          <CardTitle>Administratörer och konto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Byt användarnamn eller lösenord för det konto du är inloggad med. Alla administratörer kan
            lägga till fler konton med egna inloggningar.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ditt konto</h3>
            <p className="text-sm text-muted-foreground">
              Inloggad som <span className="font-medium text-foreground">{displayUsername}</span>
            </p>
            {authFormsMounted ? (
              <div className="grid max-w-md gap-3">
                <div className="space-y-2">
                  <Label htmlFor="me-current-password">Nuvarande lösenord</Label>
                  <Input
                    id="me-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={meCurrentPassword}
                    onChange={(event) => setMeCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="me-new-username">Nytt användarnamn (valfritt)</Label>
                  <Input
                    id="me-new-username"
                    autoComplete="username"
                    value={meNewUsername}
                    onChange={(event) => setMeNewUsername(event.target.value)}
                    placeholder="Lämna tomt om det ska vara oförändrat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="me-new-password">Nytt lösenord (valfritt)</Label>
                  <Input
                    id="me-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={meNewPassword}
                    onChange={(event) => setMeNewPassword(event.target.value)}
                    placeholder="Minst sex tecken"
                  />
                </div>
                <Button
                  type="button"
                  disabled={
                    meSaving ||
                    meCurrentPassword.length === 0 ||
                    (meNewUsername.trim().length === 0 && meNewPassword.length === 0)
                  }
                  onClick={saveOwnAccount}
                >
                  {meSaving ? "Sparar…" : "Spara ändringar"}
                </Button>
              </div>
            ) : (
              <div
                className="grid max-w-md gap-3"
                aria-busy="true"
                aria-label="Laddar kontoinställningar"
              >
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-9 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-52 animate-pulse rounded bg-muted" />
                  <div className="h-9 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                  <div className="h-9 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="h-9 w-36 animate-pulse rounded-md bg-muted/70" />
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="text-sm font-semibold">Lägg till administratör</h3>
            {authFormsMounted ? (
              <div className="grid max-w-md gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="new-admin-username">Användarnamn</Label>
                  <Input
                    id="new-admin-username"
                    autoComplete="off"
                    value={newAdminUsername}
                    onChange={(event) => setNewAdminUsername(event.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="new-admin-password">Lösenord</Label>
                  <Input
                    id="new-admin-password"
                    type="password"
                    autoComplete="new-password"
                    value={newAdminPassword}
                    onChange={(event) => setNewAdminPassword(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="sm:col-span-1 sm:w-auto"
                  disabled={
                    addingAdmin ||
                    newAdminUsername.trim().length < 3 ||
                    newAdminPassword.length < 6
                  }
                  onClick={addAnotherAdmin}
                >
                  {addingAdmin ? "Skapar…" : "Skapa"}
                </Button>
              </div>
            ) : (
              <div
                className="grid max-w-md gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                aria-busy="true"
                aria-label="Laddar formulär"
              >
                <div className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-9 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-9 animate-pulse rounded-md bg-muted/70" />
                </div>
                <div className="h-9 w-20 animate-pulse rounded-md bg-muted/70 sm:mt-6" />
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-semibold">Alla administratörskonton</h3>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga konton hittades.</p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <span className="font-medium">
                      {admin.username}
                      {admin.username === displayUsername ? (
                        <span className="ml-2 font-normal text-muted-foreground">(du)</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      sedan {formatAdminCreatedLabel(admin.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card id="admin-section-fika" className="scroll-mt-44">
        <CardHeader>
          <CardTitle>Fika per match — backfill</CardTitle>
          <p className="text-sm text-muted-foreground">
            Endast <strong>hemmamatcher</strong> visas. Ange hur mycket som sålts (SEK) per match för
            statistik och tidigare matcher. Vid backfill väljer du <strong>barnets namn från hela
            trupplistan</strong>; saknas en föräldrad i databasen skapas den automatiskt med en
            tillfällig PIN som visas efter du sparat. Du kan också lägga till föräldrar manuellt under
            nästa kort. Kryssa i ”fler än två” om ni behöver fler anmälningar för historik än dagens max
            två.
          </p>
        </CardHeader>
        <CardContent>
          <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
            {games.map((game) => (
              <AdminGameCard
                key={game.id}
                game={game}
                onRemoveSignup={removeFikaSignup}
                onRefresh={refresh}
              />
            ))}
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga hemmamatcher i databasen än — kör synk eller vänta på första kalenderhämtning.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card id="admin-section-parents" className="scroll-mt-44">
        <CardHeader>
          <CardTitle>Föräldrar och fika-anmälningar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ta bort bara från en enskild match nedan.{" "}
            <strong>Ta bort kontot</strong> raderar barnets PIN och alla framtida kopplingar — alla
            matcher för den raden tas då bort på en gång.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <Input
              placeholder="Namn"
              value={newParentName}
              onChange={(event) => setNewParentName(event.target.value)}
            />
            <Input
              placeholder="PIN (4 siffror)"
              maxLength={4}
              value={newParentPin}
              onChange={(event) => setNewParentPin(event.target.value)}
            />
            <Button onClick={addParent}>Lägg till</Button>
          </div>
          <div className="space-y-3">
            {parents.map((parent) => (
              <div key={parent.id} className="space-y-3 rounded-md border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-medium">{parent.name}</span>
                  <Button variant="destructive" onClick={() => removeParent(parent.id)}>
                    Ta bort kontot
                  </Button>
                </div>
                {parent.signups.length > 0 ? (
                  <ul className="space-y-2 border-t pt-3 text-sm">
                    {parent.signups.map((signup) => (
                      <li
                        key={signup.signupId}
                        className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">
                            {formatAdminMatchWhen(signup.startsAt)}
                          </span>
                          <span className="text-muted-foreground"> · {signup.title}</span>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => removeFikaSignup(signup.signupId)}
                        >
                          Ta bort denna match
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t pt-3 text-sm text-muted-foreground">
                    Inga fika-anmälningar ännu.
                  </p>
                )}
              </div>
            ))}
            {parents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga föräldrar registrerade ännu.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
