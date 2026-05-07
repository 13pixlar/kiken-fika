"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHasMounted } from "@/src/hooks/use-has-mounted";

export default function AdminLoginPage() {
  const router = useRouter();
  const loginFormMounted = useHasMounted();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Kunde inte logga in.");
      }

      toast.success("Inloggad.");
      router.push("/admin");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fel vid inloggning.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-5 py-8 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Admininloggning</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={login}>
            <div className="space-y-2">
              <Label htmlFor="username">Användarnamn</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              {loginFormMounted ? (
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              ) : (
                <div
                  className="h-9 animate-pulse rounded-md bg-muted"
                  aria-busy="true"
                  aria-label="Laddar fält"
                />
              )}
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Loggar in..." : "Logga in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
