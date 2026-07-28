import type { StudySession } from "./types";
import { dayKey, durationMinutes } from "./history";

/** Số liệu cộng dồn của một học viên trong khoảng đang xem */
export interface LearnerTotals {
  sessionCount: number;
  totalQuestions: number;
  totalCorrect: number;
  /** Tổng thời gian ngồi học, tính bằng phút */
  minutes: number;
  /** Số ngày khác nhau có vào học — chuyên cần quan trọng hơn tổng số buổi */
  activeDays: number;
  /** Buổi gần nhất; null khi chưa học buổi nào */
  lastStudiedAt: string | null;
}

export const EMPTY_TOTALS: LearnerTotals = {
  sessionCount: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  minutes: 0,
  activeDays: 0,
  lastStudiedAt: null,
};

export function percentOf(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function totalsFor(sessions: StudySession[]): LearnerTotals {
  if (sessions.length === 0) return EMPTY_TOTALS;

  const days = new Set<string>();
  let totalQuestions = 0;
  let totalCorrect = 0;
  let minutes = 0;
  let lastStudiedAt = sessions[0].started_at;

  for (const s of sessions) {
    days.add(dayKey(s.started_at));
    totalQuestions += s.total_questions;
    totalCorrect += s.correct_count;
    minutes += durationMinutes(s.started_at, s.ended_at);
    if (Date.parse(s.started_at) > Date.parse(lastStudiedAt)) {
      lastStudiedAt = s.started_at;
    }
  }

  return {
    sessionCount: sessions.length,
    totalQuestions,
    totalCorrect,
    minutes,
    activeDays: days.size,
    lastStudiedAt,
  };
}

/** Kết quả cộng dồn của một chủ đề: "Trái cây — 30/40 câu" */
export interface TopicStat {
  /** Khoá gộp: id chủ đề, hoặc tên khi chủ đề đã bị xoá */
  key: string;
  topicName: string;
  sessionCount: number;
  totalQuestions: number;
  totalCorrect: number;
  minutes: number;
  lastStudiedAt: string;
}

/**
 * Gộp các buổi học theo chủ đề, chủ đề làm nhiều câu nhất lên đầu.
 *
 * Gộp theo `topic_id` chứ không theo tên, vì hai chủ đề khác nhau có thể trùng
 * tên. Chủ đề đã xoá (`topic_id` null) thì đành gộp theo tên đã chụp lại.
 */
export function groupSessionsByTopic(sessions: StudySession[]): TopicStat[] {
  const byTopic = new Map<string, TopicStat>();

  for (const s of sessions) {
    const key = s.topic_id ?? `name:${s.topic_name}`;
    const stat = byTopic.get(key);
    if (stat) {
      stat.sessionCount += 1;
      stat.totalQuestions += s.total_questions;
      stat.totalCorrect += s.correct_count;
      stat.minutes += durationMinutes(s.started_at, s.ended_at);
      if (Date.parse(s.started_at) > Date.parse(stat.lastStudiedAt)) {
        stat.lastStudiedAt = s.started_at;
      }
    } else {
      byTopic.set(key, {
        key,
        topicName: s.topic_name || "Chủ đề đã xoá",
        sessionCount: 1,
        totalQuestions: s.total_questions,
        totalCorrect: s.correct_count,
        minutes: durationMinutes(s.started_at, s.ended_at),
        lastStudiedAt: s.started_at,
      });
    }
  }

  return [...byTopic.values()].sort(
    (a, b) =>
      b.totalQuestions - a.totalQuestions ||
      Date.parse(b.lastStudiedAt) - Date.parse(a.lastStudiedAt)
  );
}

/** Chia các buổi học về từng học viên — một lượt tải cho cả danh sách */
export function groupSessionsByUser(
  sessions: StudySession[]
): Map<string, StudySession[]> {
  const byUser = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const list = byUser.get(s.user_id);
    if (list) list.push(s);
    else byUser.set(s.user_id, [s]);
  }
  return byUser;
}

/**
 * Mốc 00:00 của ngày bắt đầu khoảng `days` ngày gần đây, tính cả hôm nay.
 * days = 7 vào ngày 27/07 => 00:00 ngày 21/07.
 */
export function startOfRange(days: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/**
 * Lọc theo khoảng ngày gần đây. `days <= 0` nghĩa là xem tất cả.
 *
 * Cắt theo nửa đêm địa phương chứ không phải "24 giờ trước", để "7 ngày" hiện
 * đúng 7 ô ngày trên lịch — người dùng đọc theo ngày, không theo giờ chẵn.
 */
export function sessionsWithin(
  sessions: StudySession[],
  days: number,
  now: Date = new Date()
): StudySession[] {
  if (days <= 0) return sessions;
  const from = startOfRange(days, now).getTime();
  return sessions.filter((s) => Date.parse(s.started_at) >= from);
}
