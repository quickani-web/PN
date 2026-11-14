"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type NavigationPendingContextValue = {
  pending: boolean;
  startNavigation: (navigate: () => void) => void;
};

const NavigationPendingContext =
  createContext<NavigationPendingContextValue | null>(null);

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error(
      "useNavigationPending must be used within NavigationPendingProvider",
    );
  }
  return ctx;
}

export function NavigationPendingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [linkPending, setLinkPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clear = useCallback(() => setLinkPending(false), []);

  useEffect(() => {
    clear();
  }, [pathname, searchParams, clear]);

  // Failsafe so a missed navigation never leaves the UI stuck
  useEffect(() => {
    if (!linkPending && !isPending) return;
    const t = setTimeout(() => setLinkPending(false), 12000);
    return () => clearTimeout(t);
  }, [linkPending, isPending]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      setLinkPending(true);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const startNavigation = useCallback(
    (navigate: () => void) => {
      setLinkPending(true);
      startTransition(() => {
        navigate();
      });
    },
    [startTransition],
  );

  const pending = linkPending || isPending;

  const value = useMemo(
    () => ({ pending, startNavigation }),
    [pending, startNavigation],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
      <div
        aria-hidden={!pending}
        className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-150 ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full origin-left animate-[nav-progress_1.1s_ease-in-out_infinite] bg-amber-400" />
      </div>
    </NavigationPendingContext.Provider>
  );
}

export function NavigationBusyOverlay({ children }: { children: ReactNode }) {
  const { pending } = useNavigationPending();

  return (
    <div className="relative">
      <div
        data-nav-pending={pending ? "true" : "false"}
        className={
          pending
            ? "pointer-events-none opacity-55 transition-opacity duration-150"
            : "transition-opacity duration-150"
        }
      >
        {children}
      </div>
      {pending && (
        <div
          className="pointer-events-none absolute inset-0 z-40 flex items-start justify-center bg-zinc-950/20 pt-24 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="sticky top-28 flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-4 py-2 text-sm text-zinc-200 shadow-lg shadow-black/40">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            Loading…
          </div>
        </div>
      )}
    </div>
  );
}
