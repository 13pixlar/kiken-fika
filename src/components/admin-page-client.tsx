"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppConfig } from "@/src/lib/settings";
import type { AdminParentRow } from "@/src/lib/types";

function formatAdminMatchWhen(iso: string) {
  const d = new Date(iso);
  const weekdayRaw = format(d, "EEE", { locale: sv }).replace(/\.$/, "");
  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const stamp = format(d, "d/M/yyyy HH:mm", { locale: sv });
  return `${weekday} ${stamp}`;
}

type AdminPageClientProps = {
  initialParents: AdminParentRow[];
  initialSettings: AppConfig;
};

export function AdminPageClient({ initialParents, initialSettings }: AdminPageClientProps) {
  const router = useRouter();
  const [parents, setParents] = useState<AdminParentRow[]>(initialParents);
  const [settings, setSettings] = useState<AppConfig>(initialSettings);
  const [newParentName, setNewParentName] = useState("");
  const [newParentPin, setNewParentPin] = useState("");

  const refresh = async () => {
    const [parentsRes, settingsRes] = await Promise.all([
      fetch("/api/admin/parents", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" }),
    ]);
    const parentsData = await parentsRes.json();
    const settingsData = await settingsRes.json();
    setParents(parentsData.parents ?? []);
    setSettings({
      calendarUrl: settingsData.calendarUrl ?? settings.calendarUrl,
      homeTeamName: settingsData.homeTeamName ?? settings.homeTeamName,
    });
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
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/ubk-logo.png"
            alt="Utsikten BK klubbmärke"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
          <h1 className="text-2xl font-semibold">Admin</h1>
        </div>
        <Button variant="outline" onClick={logout}>
          Logga ut
        </Button>
      </div>

      <Card>
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

      <Card>
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
