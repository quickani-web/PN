"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    AdProvider?: Array<Record<string, unknown>>;
  }
}

const ZONE_ID =
  process.env.NEXT_PUBLIC_EXOCLICK_BANNER_ZONE_ID || "6090876";

type Props = {
  className?: string;
  /** Optional keywords for better targeting (category name, etc.) */
  keywords?: string;
};

export function AdSlot({ className = "", keywords }: Props) {
  const reactId = useId();
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
  }, [allowed, reactId]);

  if (!allowed || !ZONE_ID) {
    return (
      <div
        className={`min-h-[250px] w-full max-w-[300px] ${className}`}
        aria-hidden
        data-ad-slot
      />
    );
  }

  return (
    <div
      className={`mx-auto flex min-h-[250px] w-full max-w-[300px] items-center justify-center overflow-hidden ${className}`}
      data-ad-slot
    >
      <ins
        className="eas6a97888e2"
        data-zoneid={ZONE_ID}
        {...(keywords ? { "data-keywords": keywords } : {})}
      />
    </div>
  );
}
