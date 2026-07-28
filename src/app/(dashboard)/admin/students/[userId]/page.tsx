"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { message } from "antd";
import { ArrowLeft, CalendarCheck, Clock, Target } from "lucide-react";
import { getProfile, getStudySessions } from "@/lib/db";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { emailToPhone } from "@/lib/auth";
import { formatDayLabel, formatDuration } from "@/lib/history";
import {
  groupSessionsByTopic,
  percentOf,
  sessionsWithin,
  totalsFor,
} from "@/lib/adminStats";
import type { Profile, StudySession } from "@/lib/types";
import { Screen, Loader, EmptyState } from "@/components/ui/Layout";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import StatTile from "@/components/ui/StatTile";
import StudyHistory from "@/components/StudyHistory";
import RangeFilter from "@/components/RangeFilter";

type TabKey = "topics" | "sessions";

function toneFor(pct: number): "leaf" | "sun" | "cherry" {
  if (pct >= 80) return "leaf";
  if (pct >= 50) return "sun";
  return "cherry";
}

const TONE_BG = {
  leaf: "bg-leaf-soft text-leaf-dark",
  sun: "bg-sun-soft text-sun-dark",
  cherry: "bg-cherry-soft text-cherry-dark",
} as const;

/**
 * Chi tiết một học viên: tổng hợp theo chủ đề và nhật ký từng buổi học,
 * đúng dạng khách hỏi — "27/7 vào học 20h-21h, hoa quả đúng 30/40 câu".
 */
export default function AdminStudentDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const allowed = useAdminGuard();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(0);
  const [tab, setTab] = useState<TabKey>("topics");

  useEffect(() => {
    if (!allowed || !userId) return;
    (async () => {
      try {
        const [profileRow, sessionRows] = await Promise.all([
          getProfile(userId).catch(() => null),
          getStudySessions(userId, 500).catch(() => [] as StudySession[]),
        ]);
        setProfile(profileRow as Profile | null);
        setSessions(sessionRows);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        message.error("Lỗi tải dữ liệu: " + msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed, userId]);

  const inRange = useMemo(
    () => sessionsWithin(sessions, days),
    [sessions, days]
  );
  const totals = useMemo(() => totalsFor(inRange), [inRange]);
  const topics = useMemo(() => groupSessionsByTopic(inRange), [inRange]);

  if (!allowed || loading) return <Loader />;

  const name =
    profile?.display_name?.trim() || emailToPhone(profile?.email) || "Học viên";
  const pct = percentOf(totals.totalCorrect, totals.totalQuestions);

  return (
    <Screen className="py-4">
      <button
        onClick={() => router.push("/admin/students")}
        className="mb-3 inline-flex items-center gap-1.5 font-display font-extrabold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={18} strokeWidth={2.5} />
        Danh sách học viên
      </button>

      <div className="flex items-center gap-3">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-blob bg-grape font-display text-xl font-extrabold text-white"
          aria-hidden
        >
          {name[0]?.toUpperCase() ?? "H"}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl text-ink">{name}</h1>
          <p className="font-bold text-ink-soft">
            {totals.sessionCount === 0
              ? "Chưa có buổi học nào"
              : `Học gần nhất ${formatDayLabel(totals.lastStudiedAt!)}`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <RangeFilter value={days} onChange={setDays} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatTile
          tone="sky"
          icon={<Clock size={18} />}
          value={formatDuration(totals.minutes)}
          label="thời gian học"
        />
        <StatTile
          tone="grape"
          icon={<CalendarCheck size={18} />}
          value={`${totals.sessionCount} buổi`}
          label={`trong ${totals.activeDays} ngày`}
        />
        <StatTile
          tone="leaf"
          icon={<Target size={18} />}
          value={`${totals.totalCorrect}/${totals.totalQuestions}`}
          label={`câu đúng · ${pct}%`}
        />
      </div>

      <div
        role="tablist"
        aria-label="Chế độ xem"
        className="mt-4 flex gap-1 rounded-pill bg-cloud-deep p-1"
      >
        {(
          [
            { key: "topics", label: "Theo chủ đề" },
            { key: "sessions", label: "Từng buổi" },
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
          <StudyHistory sessions={inRange} />
        ) : topics.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Chưa học chủ đề nào"
            hint="Chọn khoảng thời gian rộng hơn để xem các buổi học cũ."
          />
        ) : (
          <div className="space-y-2">
            {topics.map((t) => {
              const topicPct = percentOf(t.totalCorrect, t.totalQuestions);
              const tone = toneFor(topicPct);
              return (
                <Card key={t.key} className="flex items-center gap-3 p-3">
                  <span
                    className={`grid size-14 shrink-0 place-items-center rounded-blob font-display text-lg font-extrabold ${TONE_BG[tone]}`}
                  >
                    {topicPct}%
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-extrabold text-ink">
                      {t.topicName}
                    </p>
                    <p className="text-sm font-bold text-ink-soft">
                      {t.sessionCount} buổi · {formatDuration(t.minutes)}
                    </p>
                    <ProgressBar
                      percent={topicPct}
                      tone={tone === "cherry" ? "grape" : tone}
                      className="mt-1.5 h-2"
                      label={`${t.topicName}: ${t.totalCorrect} trên ${t.totalQuestions} câu đúng`}
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-display text-lg font-extrabold tabular-nums text-ink">
                      {t.totalCorrect}/{t.totalQuestions}
                    </div>
                    <div className="text-xs font-bold text-ink-faint">
                      câu đúng
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}
