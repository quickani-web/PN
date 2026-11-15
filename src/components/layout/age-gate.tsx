"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vidora_age_verified_v1";

type Props = {
  appName: string;
};

export function AgeGate({ appName }: Props) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const ok = window.localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!ok);
    } catch {
      setOpen(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!ready || !open) return null;

  function enter() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function exit() {
    window.location.href = "https://www.google.com/";
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-md border border-zinc-700/80 bg-zinc-950 p-8 text-center shadow-2xl shadow-black/50">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          {appName}
        </p>
        <h2
          id="age-gate-title"
          className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-zinc-50"
        >
          Are you 18+?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This site links to adult video destinations. You must be at least 18
          years old to continue. By entering, you confirm you are of legal age
          in your region.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={enter}
            className="bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            I am 18 or older — Enter
          </button>
          <button
            type="button"
            onClick={exit}
            className="border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            I am under 18 — Exit
          </button>
        </div>
      </div>
    </div>
  );
}
