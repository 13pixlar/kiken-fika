"use client";

import { useSyncExternalStore } from "react";

function noopSubscribe() {
  return () => {};
}

/**
 * False on server and during hydration; true after client takeover.
 * Use so password fields are not SSR-rendered (extensions like LastPass inject DOM and break hydration).
 */
export function useHasMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
