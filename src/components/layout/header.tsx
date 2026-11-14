"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, Menu, Search, X } from "lucide-react";
import { useNavigationPending } from "@/components/layout/navigation-pending";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Vidora";

export function Header({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pending, startNavigation } = useNavigationPending();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [open, setOpen] = useState(false);
  const [debouncing, setDebouncing] = useState(false);

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setDebouncing(false);
  }, [searchParams]);

  useEffect(() => {
    const current = searchParams.get("q") || "";
    if (q === current) {
      setDebouncing(false);
      return;
    }
    if (!q.trim()) {
      setDebouncing(false);
      return;
    }

    setDebouncing(true);
    const handle = setTimeout(() => {
      startNavigation(() => {
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [q, router, searchParams, startNavigation]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = q.trim();
    startNavigation(() => {
      router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
    });
  }

  const searching = pending || debouncing;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 lg:px-6">
        <button
          type="button"
          className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link href="/" className="shrink-0">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-amber-400">
            {APP_NAME}
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <Link
            href="/search?sort=newest"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Newest
          </Link>
          <Link
            href="/search?sort=trending"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Trending
          </Link>
          <Link
            href="/search?sort=views"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Most viewed
          </Link>
          <Link
            href="/categories"
            className="rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Categories
          </Link>
        </nav>

        <form
          onSubmit={onSubmit}
          className="relative ml-auto min-w-0 max-w-xl flex-1"
        >
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles..."
            aria-label="Search listings"
            aria-busy={searching}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-amber-400/40 focus:ring-2"
          />
          {searching && (
            <Loader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-amber-400"
              aria-label="Searching"
            />
          )}
        </form>
      </div>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            <Link
              href="/search?sort=newest"
              className="rounded-md px-2 py-2 text-sm text-zinc-200"
              onClick={() => setOpen(false)}
            >
              Newest
            </Link>
            <Link
              href="/search?sort=trending"
              className="rounded-md px-2 py-2 text-sm text-zinc-200"
              onClick={() => setOpen(false)}
            >
              Trending
            </Link>
            <Link
              href="/search?sort=views"
              className="rounded-md px-2 py-2 text-sm text-zinc-200"
              onClick={() => setOpen(false)}
            >
              Most viewed
            </Link>
            <Link
              href="/categories"
              className="rounded-md px-2 py-2 text-sm text-zinc-200"
              onClick={() => setOpen(false)}
            >
              Categories
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1">
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="truncate rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-amber-300"
                onClick={() => setOpen(false)}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
