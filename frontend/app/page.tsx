"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { fetchActionItems, InboxActionItem } from "./lib/api";

type GroupBy = "owner" | "meeting";

const TEAM = "Team";
const UNASSIGNED = "Unassigned";

const ownerOf = (item: InboxActionItem) => item.owner?.trim() || UNASSIGNED;

function initials(owner: string): string {
  const speaker = owner.match(/^speaker\s*(\d+)$/i);
  if (speaker) return `S${speaker[1]}`;
  return owner
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function OwnerBadge({ owner }: { owner: string }) {
  if (owner === TEAM) {
    return (
      <span title={TEAM} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        <Users className="h-2.5 w-2.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (owner === UNASSIGNED) {
    return <span title={UNASSIGNED} className="h-5 w-5 shrink-0 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700" />;
  }
  return (
    <span title={owner} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
      {initials(owner)}
    </span>
  );
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// due_date is a plain date — parse as local, not UTC midnight.
const dueDate = (d: string) => shortDate(`${d}T00:00:00`);

function Row({ item, showMeeting }: { item: InboxActionItem; showMeeting: boolean }) {
  const owner = ownerOf(item);
  const href = `/meetings/${item.meeting_id}${item.source_segment_id ? `?segment=${item.source_segment_id}` : ""}`;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
      >
        <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-zinc-300 group-hover:border-blue-500 dark:border-zinc-600" />
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">{item.task}</span>
        {showMeeting && (
          <span className="hidden max-w-[14rem] shrink-0 truncate text-xs text-zinc-400 group-hover:text-blue-600 sm:inline dark:text-zinc-500 dark:group-hover:text-blue-400">
            {item.meeting.title} · {shortDate(item.meeting.date)}
          </span>
        )}
        <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {item.due_date ? dueDate(item.due_date) : ""}
        </span>
        <OwnerBadge owner={owner} />
      </Link>
    </li>
  );
}

function ownerRank(owner: string) {
  if (owner === TEAM) return 1;
  if (owner === UNASSIGNED) return 2;
  return 0;
}

export default function ActionItemsInbox() {
  const [items, setItems] = useState<InboxActionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("owner");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchActionItems().then(setItems).catch((err) => setError(err.message));
  }, []);

  const owners = useMemo(() => {
    const counts = new Map<string, number>();
    items?.forEach((i) => counts.set(ownerOf(i), (counts.get(ownerOf(i)) ?? 0) + 1));
    return [...counts].sort(([a], [b]) => ownerRank(a) - ownerRank(b) || a.localeCompare(b));
  }, [items]);

  const groups = useMemo(() => {
    const visible = (items ?? []).filter((i) => !ownerFilter || ownerOf(i) === ownerFilter);
    const map = new Map<string, { label: string; meeting?: InboxActionItem["meeting"]; items: InboxActionItem[] }>();
    for (const item of visible) {
      const key = groupBy === "owner" ? ownerOf(item) : item.meeting_id;
      if (!map.has(key)) {
        map.set(key, groupBy === "owner" ? { label: key, items: [] } : { label: item.meeting.title, meeting: item.meeting, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    const list = [...map.values()];
    // items arrive newest-meeting first, so meeting groups are already ordered
    if (groupBy === "owner") list.sort((a, b) => ownerRank(a.label) - ownerRank(b.label) || a.label.localeCompare(b.label));
    return list;
  }, [items, groupBy, ownerFilter]);

  const meetingCount = new Set(items?.map((i) => i.meeting_id)).size;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Action items</h1>
          {items && (
            <p className="mt-1 text-xs text-zinc-500">
              {items.length} open across {meetingCount} meeting{meetingCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div role="radiogroup" aria-label="Group by" className="flex rounded-md bg-zinc-200/70 p-0.5 text-xs dark:bg-zinc-800">
          {(["owner", "meeting"] as const).map((g) => (
            <button
              key={g}
              role="radio"
              aria-checked={groupBy === g}
              onClick={() => setGroupBy(g)}
              className={`cursor-pointer rounded px-2.5 py-1 font-medium capitalize ${
                groupBy === g
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              By {g}
            </button>
          ))}
        </div>
      </header>

      {owners.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {[[null, items?.length ?? 0] as const, ...owners].map(([owner, count]) => {
            const active = ownerFilter === owner;
            return (
              <button
                key={owner ?? "all"}
                onClick={() => setOwnerFilter(owner)}
                aria-pressed={active}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {owner ?? "Everyone"}
                <span className={`tabular-nums ${active ? "text-blue-100" : "text-zinc-400 dark:text-zinc-600"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && items === null && <p className="mt-8 text-sm text-zinc-500">Loading…</p>}
      {items?.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">
          No action items yet. <Link href="/meetings" className="text-blue-600 hover:underline dark:text-blue-400">Upload a meeting</Link> to get started.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <section key={group.meeting?.id ?? group.label}>
            <h2 className="flex items-center gap-2 border-b border-zinc-200 px-3 pb-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800">
              {group.meeting ? (
                <Link href={`/meetings/${group.meeting.id}`} className="inline-flex min-w-0 items-center gap-1 text-zinc-800 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400">
                  <span className="truncate">{group.label}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                </Link>
              ) : (
                <>
                  <OwnerBadge owner={group.label} />
                  <span className="text-zinc-800 dark:text-zinc-200">{group.label}</span>
                </>
              )}
              {group.meeting && <span className="shrink-0">{shortDate(group.meeting.date)}</span>}
              <span className="ml-auto tabular-nums">{group.items.length}</span>
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {group.items.map((item) => (
                <Row key={item.id} item={item} showMeeting={groupBy === "owner"} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
