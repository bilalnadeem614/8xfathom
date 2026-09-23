"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Circle, Loader2, XCircle } from "lucide-react";
import { API_URL, Meeting, MeetingStatus } from "./lib/api";

const STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; color: string; icon: typeof Circle }
> = {
  ready: { label: "Ready", color: "text-emerald-600 dark:text-emerald-400", icon: Circle },
  processing: { label: "Processing", color: "text-amber-600 dark:text-amber-400", icon: Loader2 },
  uploading: { label: "Uploading", color: "text-amber-600 dark:text-amber-400", icon: Loader2 },
  failed: { label: "Failed", color: "text-red-600 dark:text-red-400", icon: XCircle },
};

function StatusBadge({ status }: { status: MeetingStatus }) {
  const { label, color, icon: Icon } = STATUS_CONFIG[status];
  const spinning = status === "processing" || status === "uploading";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon className={`h-3 w-3 ${spinning ? "animate-spin" : "fill-current"}`} strokeWidth={2.5} />
      {label}
    </span>
  );
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/meetings`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch meetings: ${res.status}`);
        return res.json();
      })
      .then(setMeetings)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Meetings
        </h1>
        {meetings && meetings.length > 0 && (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {meetings.length} total
          </span>
        )}
      </div>

        {error && <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && meetings === null && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}
        {meetings?.length === 0 && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">No meetings yet</p>
        )}

        {meetings && meetings.length > 0 && (
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {meeting.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                      <Calendar className="h-3 w-3" strokeWidth={2} />
                      {new Date(meeting.date).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {formatDuration(meeting.duration_seconds) && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">·</span>
                          <Clock className="h-3 w-3" strokeWidth={2} />
                          {formatDuration(meeting.duration_seconds)}
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </Link>
              </li>
            ))}
          </ul>
      )}
    </main>
  );
}
