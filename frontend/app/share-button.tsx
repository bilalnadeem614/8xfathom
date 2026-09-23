"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ meetingId, className }: { meetingId: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meetingId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) -- nothing sensible to fall back to
    }
  };

  return (
    <button
      onClick={copy}
      aria-label="Copy shareable link"
      className={`pointer-events-auto inline-flex shrink-0 cursor-pointer items-center gap-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ${className ?? ""}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
      ) : (
        <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
      )}
    </button>
  );
}
