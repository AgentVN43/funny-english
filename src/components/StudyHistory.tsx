"use client";

import { CalendarDays, Clock, Target } from "lucide-react";
import type { StudySession } from "@/lib/types";
import {
  durationMinutes,
  formatDuration,
  formatTimeRange,
  groupSessionsByDay,
} from "@/lib/history";
import Card from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Layout";
import ProgressBar from "@/components/ui/ProgressBar";

function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** Xanh khi làm tốt, vàng khi tạm được, đỏ khi cần cố thêm */
function toneFor(pct: number): "leaf" | "sun" | "cherry" {
  if (pct >= 80) return "leaf";
  if (pct >= 50) return "sun";
  return "cherry";
}

const TONE_TEXT = {
  leaf: "text-leaf-dark",
  sun: "text-sun-dark",
  cherry: "text-cherry-dark",
} as const;

const TONE_BG = {
  leaf: "bg-leaf-soft",
  sun: "bg-sun-soft",
  cherry: "bg-cherry-soft",
} as const;

/**
 * Lịch sử buổi học theo ngày — đúng dạng khách yêu cầu:
 * "27/7 vào học từ 20h-21h, chủ đề hoa quả đúng 30/40 câu".
 */
export default function StudyHistory({
  sessions,
}: {
  sessions: StudySession[];
}) {
  const days = groupSessionsByDay(sessions);

  if (days.length === 0) {
    return (
      <EmptyState
        emoji="📅"
        title="Chưa có buổi học nào"
        hint="Học xong một chủ đề là kết quả sẽ hiện ở đây ngay."
      />
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.key}>
          {/* Đầu ngày */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg text-ink">
              <CalendarDays size={18} className="text-grape" />
              {day.label}
            </h3>
            <div className="flex items-center gap-3 text-sm font-bold text-ink-soft">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(day.minutes)}
              </span>
              <span className="flex items-center gap-1 text-ink">
                <Target size={14} className="text-ink-soft" />
                {day.totalCorrect}/{day.totalQuestions}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {day.sessions.map((s) => {
              const pct = percent(s.correct_count, s.total_questions);
              const tone = toneFor(pct);
              const mins = durationMinutes(s.started_at, s.ended_at);
              return (
                <Card key={s.id} className="flex items-center gap-3 p-3">
                  <span
                    className={`grid size-14 shrink-0 place-items-center rounded-blob font-display text-lg font-extrabold ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
                  >
                    {pct}%
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-extrabold text-ink">
                      {s.topic_name || "Chủ đề đã xoá"}
                    </p>
                    <p className="text-sm font-bold text-ink-soft">
                      {formatTimeRange(s.started_at, s.ended_at)}
                      {mins > 0 && ` · ${formatDuration(mins)}`}
                    </p>
                    <ProgressBar
                      percent={pct}
                      tone={tone === "cherry" ? "grape" : tone}
                      className="mt-1.5 h-2"
                      label={`${s.topic_name}: ${s.correct_count} trên ${s.total_questions} câu đúng`}
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-display text-lg font-extrabold text-ink tabular-nums">
                      {s.correct_count}/{s.total_questions}
                    </div>
                    <div className="text-xs font-bold text-ink-faint">
                      câu đúng
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
