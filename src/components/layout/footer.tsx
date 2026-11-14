import Link from "next/link";

export function Footer({ appName }: { appName: string }) {
  return (
    <footer className="mt-16 border-t border-zinc-900 bg-zinc-950">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-8 text-sm text-zinc-500 lg:flex-row lg:items-start lg:justify-between lg:px-6">
        <div className="max-w-xl">
          <p>
            © {new Date().getFullYear()} {appName}. A video-link directory — we do
            not host or stream video files.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/categories" className="hover:text-zinc-300">
            Categories
          </Link>
          <Link href="/search" className="hover:text-zinc-300">
            Search
          </Link>
        </div>
      </div>
    </footer>
  );
}
