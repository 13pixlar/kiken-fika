"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupPostSchema } from "@/src/lib/validators";
import { FIKA_PLAYER_NAMES } from "@/src/lib/constants";
import { cn } from "@/lib/utils";
import type { GameRow } from "@/src/lib/types";
import type { z } from "zod";

type SignupDialogProps = {
  game: GameRow;
  onDone: () => Promise<void>;
  /** När platser är fulla kan man inte lägga till fler men fortfarande ta bort med PIN. */
  signupFull: boolean;
};

type FormValues = z.infer<typeof signupPostSchema>;

export function SignupDialog({ game, onDone, signupFull }: SignupDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(signupPostSchema),
    defaultValues: {
      gameId: game.id,
      parentName: "",
      pin: "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const response = await fetch("/api/signups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Kunde inte spara anmälan.");
      return;
    }

    toast.success("Anmälan sparad.");
    setOpen(false);
    form.reset({ gameId: game.id, parentName: values.parentName, pin: "" });
    await onDone();
  });

  const removeSignup = async () => {
    setDeleting(true);
    try {
      const values = form.getValues();
      const response = await fetch("/api/signups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Kunde inte ta bort anmälan.");
        return;
      }

      toast.success("Anmälan borttagen.");
      setOpen(false);
      form.reset({ gameId: game.id, parentName: values.parentName, pin: "" });
      await onDone();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap gap-2">
        {signupFull ? (
          <DialogTrigger
            render={
              <Button
                type="button"
                className="px-4 py-2 text-sm"
                variant="outline"
                disabled={!game.isHomeGame}
              />
            }
          >
            Ta bort anmälan
          </DialogTrigger>
        ) : (
          <DialogTrigger
            render={
              <Button
                type="button"
                className="px-4 py-2 text-sm"
                disabled={!game.isHomeGame}
              />
            }
          >
            Anmäl dig
          </DialogTrigger>
        )}
      </div>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fikaförsäljning</DialogTitle>
          <DialogDescription>
            Välj <strong>ditt barns namn</strong> i listan och en <strong>fyrsiffrig PIN</strong>{" "}
            (välj första gången, spara den). När barnet väl har en PIN krävs samma PIN för att anmäla
            eller ta bort fika för det namnet.
            {signupFull ? (
              <>
                {" "}
                <span className="text-foreground">
                  Båda platserna är anmälda — nya anmälningar går inte, men du kan ta bort en befintlig
                  anmälan nedan.
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <input type="hidden" {...form.register("gameId", { valueAsNumber: true })} />
          <div className="space-y-2">
            <Label htmlFor={`parent-name-${game.id}`}>Barnets namn</Label>
            <select
              id={`parent-name-${game.id}`}
              autoComplete="off"
              className={cn(
                "h-8 w-full min-w-0 border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
                "rounded-lg",
                form.formState.errors.parentName && "border-destructive",
              )}
              aria-invalid={!!form.formState.errors.parentName}
              {...form.register("parentName")}
            >
              <option value="">Välj namn...</option>
              {FIKA_PLAYER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {form.formState.errors.parentName ? (
              <p className="text-sm text-destructive">{form.formState.errors.parentName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pin-${game.id}`}>Din fyrsiffriga PIN</Label>
            <Input
              id={`pin-${game.id}`}
              maxLength={4}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Fyra siffror"
              {...form.register("pin")}
            />
            {form.formState.errors.pin ? (
              <p className="text-sm text-destructive">{form.formState.errors.pin.message}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || signupFull}
              title={
                signupFull ? "Fullt — använd ”Ta bort anmälan” om du måste göra plats." : undefined
              }
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                "Anmäl till fika"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleting || form.formState.isSubmitting}
              onClick={removeSignup}
            >
              {deleting ? "Tar bort..." : "Ta bort anmälan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
