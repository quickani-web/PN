import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[{ name: "Home", href: "/" }, { name: title }]}
      />
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-semibold text-zinc-50 sm:text-3xl">
        {title}
      </h1>
      <div className="space-y-5 text-sm leading-relaxed text-zinc-400 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_a]:text-amber-400 [&_a]:hover:text-amber-300 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-10 text-xs text-zinc-600">
        Also see:{" "}
        <Link href="/terms">Terms</Link>
        {" · "}
        <Link href="/privacy">Privacy</Link>
        {" · "}
        <Link href="/dmca">DMCA</Link>
        {" · "}
        <Link href="/2257">18 U.S.C. § 2257</Link>
      </p>
    </div>
  );
}
