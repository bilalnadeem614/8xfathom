export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type MeetingStatus = "uploading" | "processing" | "ready" | "failed";

export type Meeting = {
  id: string;
  title: string;
  date: string;
  duration_seconds: number | null;
  participants: string[];
  status: MeetingStatus;
  audio_url: string | null;
  created_at: string;
};

export type TranscriptSegment = {
  id: string;
  meeting_id: string;
  speaker: string | null;
  start_time: number;
  end_time: number;
  text: string;
};

export type Summary = {
  id: string;
  meeting_id: string;
  template_type: string;
  content: string;
  generated_at: string;
};

export type ActionItem = {
  id: string;
  meeting_id: string;
  owner: string | null;
  task: string;
  due_date: string | null;
  source_segment_id: string | null;
};

export type MeetingDetail = Meeting & {
  transcript_segments: TranscriptSegment[];
  summaries: Summary[];
  action_items: ActionItem[];
};

export async function fetchMeeting(id: string): Promise<MeetingDetail> {
  const res = await fetch(`${API_URL}/meetings/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch meeting: ${res.status}`);
  return res.json();
}

export async function fetchAudioUrl(id: string): Promise<{ url: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/meetings/${id}/audio-url`);
  if (!res.ok) throw new Error(`Failed to fetch audio url: ${res.status}`);
  return res.json();
}
