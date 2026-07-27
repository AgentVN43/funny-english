import type { StudySession } from "./types";

/** Các buổi học trong cùng một ngày, kèm số liệu cộng dồn của ngày đó */
export interface SessionDay {
  /** Khoá sắp xếp dạng YYYY-MM-DD theo giờ địa phương */
  key: string;
  /** Nhãn hiển thị dạng DD/MM/YYYY */
  label: string;
  sessions: StudySession[];
  totalQuestions: number;
  totalCorrect: number;
  /** Tổng thời gian học trong ngày, tính bằng phút */
  minutes: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Ngày theo giờ địa phương — buổi học 23h30 phải nằm ở ngày hôm đó, không lệch sang hôm sau */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "20:05 – 20:48" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatClock(startIso)} – ${formatClock(endIso)}`;
}

export function durationMinutes(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "dưới 1 phút";
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

/**
 * Gom các buổi học theo ngày, ngày mới nhất lên đầu, trong mỗi ngày thì buổi
 * mới nhất lên đầu — đúng dạng khách muốn xem:
 *
 *   27/07/2026
 *     20:05 – 20:48   Trái cây   30/40
 *     21:10 – 21:35   Con vật    35/50
 */
export function groupSessionsByDay(sessions: StudySession[]): SessionDay[] {
  const byDay = new Map<string, StudySession[]>();

  for (const s of sessions) {
    const key = dayKey(s.started_at);
    const list = byDay.get(key);
    if (list) list.push(s);
    else byDay.set(key, [s]);
  }

  const days: SessionDay[] = [];
  for (const [key, list] of byDay) {
    const ordered = [...list].sort(
      (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)
    );
    days.push({
      key,
      label: formatDayLabel(ordered[0].started_at),
      sessions: ordered,
      totalQuestions: ordered.reduce((n, s) => n + s.total_questions, 0),
      totalCorrect: ordered.reduce((n, s) => n + s.correct_count, 0),
      minutes: ordered.reduce(
        (n, s) => n + durationMinutes(s.started_at, s.ended_at),
        0
      ),
    });
  }

  return days.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}
