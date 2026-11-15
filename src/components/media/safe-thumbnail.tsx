"use client";

import { useState } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
};

function isFragileOrMissing(src: string | null | undefined): boolean {
  if (!src || !src.startsWith("https://")) return true;
  // Signed / temporary PH CDN hosts — almost always dead in-browser
  if (src.includes("pix-cdn77.") || src.includes("pix-fl.")) return true;
  if (src.includes("validto=") || src.includes("hdnea=")) return true;
  return false;
}

function Placeholder({ className }: { className: string }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10 text-zinc-600"
        fill="currentColor"
      >
        <path d="M8 5.14v14l11-7-11-7z" />
      </svg>
    </div>
  );
}

/** External thumbs often expire; never show the browser broken-image icon. */
export function SafeThumbnail({ src, alt, className = "" }: Props) {
  const [failed, setFailed] = useState(() => isFragileOrMissing(src));

  if (failed) {
    return <Placeholder className={className} />;
  }

  return (
    <>
      <Placeholder className={className} />
      {/* eslint-disable-next-line @next/next/no-img-element -- remote CDNs; need onError fallback */}
      <img
        src={src!}
        alt=""
        title={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`absolute inset-0 z-[1] h-full w-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    </>
  );
}
