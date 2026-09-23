"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL, Meeting, MeetingStatus } from "./lib/api";

const STATUS_STYLES: Record<MeetingStatus, string> = {
  ready: "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  uploading: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Meetings
        </h1>
        {error && <p className="mt-6 text-red-500">{error}</p>}
        {!error && meetings === null && (
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}
        {meetings?.length === 0 && (
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">
            No meetings yet
          </p>
        )}
        {meetings && meetings.length > 0 && (
          <ul className="mt-6 flex flex-col gap-3">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="font-medium text-black dark:text-zinc-50">
                      {meeting.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(meeting.date).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {formatDuration(meeting.duration_seconds) &&
                        ` · ${formatDuration(meeting.duration_seconds)}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[meeting.status]}`}
                  >
                    {meeting.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
