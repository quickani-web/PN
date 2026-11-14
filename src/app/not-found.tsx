import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-zinc-50">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        The listing or page you requested is unavailable.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950"
      >
        Back to home
      </Link>
    </div>
  );
}
