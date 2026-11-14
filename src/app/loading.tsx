import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-zinc-400">
      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      <p className="text-sm">Loading…</p>
    </div>
  );
}
