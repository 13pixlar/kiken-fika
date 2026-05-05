"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const inFlight = new Map<string, Promise<{ badgeUrl: string | null }>>();

function loadBadge(team: string): Promise<{ badgeUrl: string | null }> {
  const key = team.trim();
  if (!key) {
    return Promise.resolve({ badgeUrl: null });
  }
  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetch(`/api/team-badge?team=${encodeURIComponent(key)}`)
      .then(async (response) => {
        if (!response.ok) {
          return { badgeUrl: null };
        }
        const data = (await response.json()) as { badgeUrl?: string | null };
        const badgeUrl =
          typeof data.badgeUrl === "string" && data.badgeUrl.length > 0 ? data.badgeUrl : null;
        return { badgeUrl };
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, pending);
  }
  return pending;
}

export function TeamBadge({
  teamName,
  className,
  imgClassName,
}: {
  teamName: string;
  className?: string;
  /** Applied to the `Image`; default keeps SvFF crests unobstructed. */
  imgClassName?: string;
}) {
  const trimmed = teamName.trim();
  const [badgeUrl, setBadgeUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!trimmed) {
      return;
    }
    let cancelled = false;
    void loadBadge(trimmed).then((data) => {
      if (!cancelled) {
        setBadgeUrl(data.badgeUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  if (!trimmed) {
    return null;
  }

  if (badgeUrl == null || badgeUrl === "") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-visible",
        className,
      )}
    >
      <Image
        src={badgeUrl}
        alt=""
        width={48}
        height={48}
        sizes="48px"
        className={cn("size-12 object-contain", imgClassName)}
      />
    </span>
  );
}
