import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        if (v && k !== "page") params.set(k, v);
      }
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages = [];
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1"
    >
      {page > 1 && (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Previous
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={`min-w-9 rounded-md px-3 py-2 text-center text-sm ${
            p === page
              ? "bg-amber-500 text-zinc-950"
              : "text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={href(page + 1)}
          rel="next"
          className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
