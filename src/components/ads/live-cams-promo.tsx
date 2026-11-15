import { config } from "@/lib/config";

type Props = {
  className?: string;
  compact?: boolean;
};

export function LiveCamsPromo({ className = "", compact = false }: Props) {
  const href = config.chaturbateAffiliateUrl;
  if (!href) return null;

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className={`block rounded-md border border-pink-500/40 bg-pink-500/10 px-2.5 py-2 text-center text-sm font-semibold text-pink-300 transition hover:border-pink-400 hover:bg-pink-500/20 hover:text-pink-200 ${className}`}
      >
        Live Cams →
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className={`group block overflow-hidden rounded-lg border border-pink-500/30 bg-gradient-to-r from-pink-950/80 via-zinc-900 to-zinc-900 p-4 transition hover:border-pink-400/60 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pink-400/90">
        Affiliate · Live now
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-zinc-50 group-hover:text-pink-200">
        Watch free live cams
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        Thousands online — click to enter Chaturbate
      </p>
      <span className="mt-3 inline-flex rounded bg-pink-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition group-hover:bg-pink-400">
        Join free →
      </span>
    </a>
  );
}
