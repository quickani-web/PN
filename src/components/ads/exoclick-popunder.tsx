"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    AdProvider?: Array<Record<string, unknown>>;
  }
}

const ZONE_ID =
  process.env.NEXT_PUBLIC_EXOCLICK_POPUNDER_ZONE_ID || "6090880";

/** ExoClick popunder — fires after 18+ confirmation. */
export function ExoClickPopunder() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unlock = () => setAllowed(true);
    try {
      if (window.localStorage.getItem("vidora_age_verified_v1") === "1") {
        unlock();
      }
    } catch {
      unlock();
    }
    window.addEventListener("vidora-age-verified", unlock);
    return () => window.removeEventListener("vidora-age-verified", unlock);
  }, []);

  useEffect(() => {
    if (!allowed || !ZONE_ID) return;
    window.AdProvider = window.AdProvider || [];
    window.AdProvider.push({ serve: {} });
  }, [allowed]);

  if (!allowed || !ZONE_ID) return null;

  return <ins className="eas6a97888e10" data-zoneid={ZONE_ID} />;
}
