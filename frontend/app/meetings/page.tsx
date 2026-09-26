"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Circle, Loader2, XCircle, Upload, X, Pencil } from "lucide-react";
import { API_URL, Meeting, MeetingStatus, renameMeeting, uploadMeeting } from "../lib/api";
import { ShareButton } from "../share-button";

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

function EditableTitle({ meeting, onSaved }: { meeting: Meeting; onSaved: (m: Meeting) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(meeting.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const title = value.trim();
    setEditing(false);
    if (!title || title === meeting.title) {
      setValue(meeting.title);
      return;
    }
    try {
      const updated = await renameMeeting(meeting.id, title);
      onSaved(updated);
    } catch {
      setValue(meeting.title);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.preventDefault()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") { setValue(meeting.title); setEditing(false); }
        }}
        className="pointer-events-auto w-full truncate rounded border border-blue-500 bg-transparent px-1 text-sm font-medium text-zinc-900 outline-none dark:text-zinc-50"
      />
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{meeting.title}</p>
      <button
        onClick={() => setEditing(true)}
        aria-label="Edit title"
        className="pointer-events-auto shrink-0 cursor-pointer text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        <Pencil className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  );
}

function UploadModal({
  onClose,
  onStarted,
  onSettled,
}: {
  onClose: () => void;
  onStarted: (tempId: string, title: string) => void;
  onSettled: (tempId: string, err: string | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const tempId = `temp-${Date.now()}`;
    uploadMeeting(file, title)
      .then(() => onSettled(tempId, null))
      .catch((err) => onSettled(tempId, err instanceof Error ? err.message : "Upload failed"));
    onStarted(tempId, title.trim() || file.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Upload meeting</h2>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:text-zinc-50"
          />
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer text-sm text-zinc-700 file:cursor-pointer dark:text-zinc-300"
          />
          <button
            type="submit"
            disabled={!file}
            className="mt-1 cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const refetch = () => {
    return fetch(`${API_URL}/meetings`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch meetings: ${res.status}`);
        return res.json();
      })
      .then((data: Meeting[]) => {
        setMeetings(data);
        return data;
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    const hasPending = meetings?.some((m) => m.status === "processing" || m.status === "uploading");
    if (!hasPending) return;
    const timer = setTimeout(refetch, 3000);
    return () => clearTimeout(timer);
  }, [meetings]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Meetings
        </h1>
        <div className="flex items-center gap-3">
          {meetings && meetings.length > 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {meetings.length} total
            </span>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={2} />
            Upload meeting
          </button>
        </div>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onStarted={(tempId, title) => {
            const now = new Date().toISOString();
            setMeetings((prev) => [
              {
                id: tempId,
                title,
                date: now,
                duration_seconds: null,
                participants: [],
                status: "uploading",
                audio_url: null,
                created_at: now,
              },
              ...(prev ?? []),
            ]);
            setTimeout(refetch, 1500);
          }}
          onSettled={(tempId, err) => {
            if (err) {
              setError(err);
              setMeetings((prev) => prev?.filter((m) => m.id !== tempId) ?? prev);
            }
            refetch();
          }}
        />
      )}

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
              <li key={meeting.id} className="relative">
                <Link
                  href={`/meetings/${meeting.id}`}
                  aria-label={meeting.title}
                  className="absolute -inset-x-2 inset-y-0 rounded-lg transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70"
                />
                <div className="pointer-events-none relative flex items-center gap-4 px-2 py-3">
                  <div className="min-w-0 flex-1">
                    <EditableTitle
                      meeting={meeting}
                      onSaved={(updated) =>
                        setMeetings((prev) => prev?.map((m) => (m.id === updated.id ? updated : m)) ?? prev)
                      }
                    />
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
                  {meeting.status === "ready" && !meeting.id.startsWith("temp-") && (
                    <ShareButton meetingId={meeting.id} />
                  )}
                  <StatusBadge status={meeting.status} />
                </div>
              </li>
            ))}
          </ul>
      )}
    </main>
  );
}
