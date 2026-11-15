import Link from "next/link";

export function Footer({ appName }: { appName: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-zinc-900 bg-zinc-950">
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-10 text-sm text-zinc-500 lg:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500/90">
              Adults only · 18+
            </p>
            <p className="leading-relaxed">
              © {year} {appName}. This website contains adult material and is
              intended for adults only. By using this site you confirm you are at
              least 18 years old (or the age of majority where you live) and that
              you want to view adult content.
            </p>
            <p className="leading-relaxed text-zinc-600">
              {appName} is a video-link directory / information location tool. We
              do not host, upload, or stream video files. Listings open
              third-party websites that we do not control. See our{" "}
              <Link href="/2257" className="text-zinc-400 hover:text-zinc-200">
                18 U.S.C. § 2257
              </Link>{" "}
              statement.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-zinc-400 sm:grid-cols-3">
            <Link href="/categories" className="hover:text-zinc-200">
              Categories
            </Link>
            <Link href="/search" className="hover:text-zinc-200">
              Search
            </Link>
            <Link href="/terms" className="hover:text-zinc-200">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-200">
              Privacy
            </Link>
            <Link href="/dmca" className="hover:text-zinc-200">
              DMCA
            </Link>
            <Link href="/2257" className="hover:text-zinc-200">
              18 U.S.C. 2257
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Parental controls / content filtering resources:{" "}
            <a
              href="https://www.rtalabel.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300"
            >
              RTA label
            </a>
            ,{" "}
            <a
              href="https://www.asacp.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300"
            >
              ASACP
            </a>
            .
          </p>
          <p className="font-mono tracking-wide text-zinc-700">
            RTA-5042-1996-1400-1577-RTA
          </p>
        </div>
      </div>
    </footer>
  );
}
