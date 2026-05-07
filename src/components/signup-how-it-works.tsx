import { cn } from "@/lib/utils";

type SignupHowItWorksExplanationProps = {
  variant: "dialog" | "panel";
};

/**
 * Shared copy: how parents sign up / remove fika (shown in modal and “Hur gör man”).
 */
export function SignupHowItWorksExplanation({ variant }: SignupHowItWorksExplanationProps) {
  const strong = cn(variant === "panel" && "text-white");
  return (
    <>
      Välj <strong className={strong}>ditt barns namn</strong> i listan och en{" "}
      <strong className={strong}>fyrsiffrig PIN</strong> (välj första gången, spara den). När barnet
      väl har en PIN krävs samma PIN för att anmäla eller ta bort fika för det namnet.
    </>
  );
}
