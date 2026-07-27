"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProgress, getStudySessions } from "@/lib/db";
import { message } from "antd";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { Screen, Loader, EmptyState } from "@/components/ui/Layout";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import StudyHistory from "@/components/StudyHistory";
import { isMastered } from "@/lib/constants";
import type { StudySession } from "@/lib/types";

interface ProgressItem {
  id: string;
  card_id: string;
  correct_count: number;
  wrong_count: number;
  streak: number;
  status: "learning" | "mastered";
  cards: {
    word: string;
    meaning_vi: string;
    topic_id: string;
    topics: { id: string; name: string };
  };
}

interface TopicGroup {
  topicId: string;
  topicName: string;
  items: ProgressItem[];
}

type TabKey = "sessions" | "words";

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<TabKey>("sessions");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login?redirect=%2Fprogress");
        return;
      }
      setUserId(session.user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        // Bảng study_sessions có thể chưa được tạo (chưa chạy migration) —
        // không được vì thế mà mất luôn phần tiến độ từ vựng
        const [data, sessionRows] = await Promise.all([
          getProgress(userId),
          getStudySessions(userId).catch(() => [] as StudySession[]),
        ]);
        setProgress(data as ProgressItem[]);
        setSessions(sessionRows);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        message.error("Lỗi tải dữ liệu: " + msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const grouped: TopicGroup[] = Object.values(
    progress.reduce(
      (acc, item) => {
        const tId = item.cards?.topics?.id || "unknown";
        const tName = item.cards?.topics?.name || "Không có chủ đề";
        if (!acc[tId]) acc[tId] = { topicId: tId, topicName: tName, items: [] };
        acc[tId].items.push(item);
        return acc;
      },
      {} as Record<string, TopicGroup>
    )
  );

  if (loading) return <Loader />;

  return (
    <Screen className="py-4">
      <h1 className="text-2xl text-ink">Tiến độ học tập</h1>
      <p className="mt-1 font-bold text-ink-soft">
        Thời gian vào học và kết quả từng chủ đề
      </p>

      {/* Chuyển tab dạng viên thuốc — to, dễ bấm bằng ngón cái */}
      <div
        role="tablist"
        aria-label="Chế độ xem tiến độ"
        className="mt-4 flex gap-1 rounded-pill bg-cloud-deep p-1"
      >
        {(
          [
            { key: "sessions", label: "Buổi học" },
            { key: "words", label: "Từ vựng" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-pill py-2.5 font-display font-extrabold transition-colors ${
              tab === t.key ? "bg-white text-grape shadow-sm" : "text-ink-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "sessions" ? (
          <StudyHistory sessions={sessions} />
        ) : progress.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="Chưa học từ nào"
            hint="Chọn một chủ đề ở trang chủ để bắt đầu nhé!"
          />
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => {
              const isOpen = expanded[group.topicId] ?? false;
              const masteredCount = group.items.filter((i) =>
                isMastered(i.streak)
              ).length;
              const pct = (masteredCount / group.items.length) * 100;

              return (
                <Card key={group.topicId} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpanded((p) => ({
                        ...p,
                        [group.topicId]: !p[group.topicId],
                      }))
                    }
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className="shrink-0 text-ink-faint">
                      {isOpen ? (
                        <ChevronDown size={20} strokeWidth={2.5} />
                      ) : (
                        <ChevronRight size={20} strokeWidth={2.5} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-extrabold text-ink">
                        {group.topicName}
                      </p>
                      <p className="text-sm font-bold text-ink-soft">
                        Đã thuộc {masteredCount}/{group.items.length} từ
                      </p>
                      <ProgressBar
                        percent={pct}
                        tone="leaf"
                        className="mt-1.5 h-2"
                        label={`${group.topicName}: ${masteredCount} trên ${group.items.length} từ`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-cloud-deep">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 border-b border-cloud px-4 py-3 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-base font-extrabold text-ink">
                              {item.cards?.word || "—"}
                            </p>
                            <p className="truncate text-sm text-ink-soft">
                              {item.cards?.meaning_vi || ""}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2 py-1 text-sm font-extrabold text-leaf-dark">
                              <Check size={13} strokeWidth={3} />
                              {item.correct_count}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-cherry-soft px-2 py-1 text-sm font-extrabold text-cherry-dark">
                              <X size={13} strokeWidth={3} />
                              {item.wrong_count}
                            </span>
                            {isMastered(item.streak) && (
                              <span className="text-xl" title="Đã thuộc">
                                ⭐
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}
