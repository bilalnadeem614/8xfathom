"use client";

import { useEffect, useState } from "react";

type Meeting = {
  id: string;
  title: string;
  status: string;
};

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/meetings`)
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
              <li
                key={meeting.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="font-medium text-black dark:text-zinc-50">
                  {meeting.title}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {meeting.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
