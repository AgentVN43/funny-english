"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { ChevronRight, Clock, Search, Target, Users } from "lucide-react";
import { getAllProfiles, getAllStudySessions } from "@/lib/db";
import { useAdminGuard } from "@/lib/useAdminGuard";
import { emailToPhone } from "@/lib/auth";
import { formatDayLabel, formatDuration } from "@/lib/history";
import {
  groupSessionsByUser,
  percentOf,
  sessionsWithin,
  totalsFor,
  type LearnerTotals,
} from "@/lib/adminStats";
import type { Profile, StudySession } from "@/lib/types";
import { Screen, Loader, EmptyState } from "@/components/ui/Layout";
import { TappableCard } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import StatTile from "@/components/ui/StatTile";
import RangeFilter from "@/components/RangeFilter";

interface LearnerRow {
  profile: Profile;
  name: string;
  totals: LearnerTotals;
}

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
 * Bảng theo dõi học viên của admin: ai học bao lâu, đúng bao nhiêu câu,
 * học gần nhất khi nào. Bấm vào một người để xem chi tiết từng buổi.
 */
export default function AdminStudentsPage() {
  const router = useRouter();
  const allowed = useAdminGuard();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        // Bảng study_sessions có thể chưa được tạo (chưa chạy migration) —
        // vẫn phải hiện được danh sách học viên thay vì hỏng cả trang
        const [profileRows, sessionRows] = await Promise.all([
          getAllProfiles(),
          getAllStudySessions().catch(() => [] as StudySession[]),
        ]);
        setProfiles(profileRows);
        setSessions(sessionRows);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        message.error("Lỗi tải dữ liệu: " + msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  const rows: LearnerRow[] = useMemo(() => {
    const inRange = sessionsWithin(sessions, days);
    const byUser = groupSessionsByUser(inRange);

    return (
      profiles
        // Tài khoản quản trị không phải học viên, không đưa vào bảng theo dõi
        .filter((p) => p.role !== "admin")
        .map((p) => ({
          profile: p,
          name: p.display_name?.trim() || emailToPhone(p.email) || "Học viên",
          totals: totalsFor(byUser.get(p.id) ?? []),
        }))
        .sort((a, b) => {
          // Người học gần đây nhất lên đầu, người chưa học xuống cuối
          const ta = a.totals.lastStudiedAt
            ? Date.parse(a.totals.lastStudiedAt)
            : -1;
          const tb = b.totals.lastStudiedAt
            ? Date.parse(b.totals.lastStudiedAt)
            : -1;
          return tb - ta || a.name.localeCompare(b.name);
        })
    );
  }, [profiles, sessions, days]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          active: acc.active + (r.totals.sessionCount > 0 ? 1 : 0),
          minutes: acc.minutes + r.totals.minutes,
          correct: acc.correct + r.totals.totalCorrect,
          questions: acc.questions + r.totals.totalQuestions,
        }),
        { active: 0, minutes: 0, correct: 0, questions: 0 }
      ),
    [rows]
  );

  if (!allowed || loading) return <Loader />;

  return (
    <Screen className="py-4">
      <h1 className="text-2xl text-ink">Theo dõi học viên</h1>
      <p className="mt-1 font-bold text-ink-soft">
        Thời gian vào học và kết quả từng chủ đề của mỗi bạn
      </p>

      <div className="mt-4">
        <RangeFilter value={days} onChange={setDays} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatTile
          tone="grape"
          icon={<Users size={18} />}
          value={`${summary.active}/${rows.length}`}
          label="học viên có học"
        />
        <StatTile
          tone="sky"
          icon={<Clock size={18} />}
          value={formatDuration(summary.minutes)}
          label="tổng thời gian"
        />
        <StatTile
          tone="leaf"
          icon={<Target size={18} />}
          value={`${summary.correct}/${summary.questions}`}
          label="câu đúng"
        />
      </div>

      {/* Tìm nhanh khi lớp đông */}
      <div className="relative mt-4">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm học viên theo tên hoặc số điện thoại"
          aria-label="Tìm học viên"
          className="min-h-12 w-full rounded-pill border-2 border-cloud-deep bg-white pl-11 pr-4 font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-grape"
        />
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            emoji="🧒"
            title="Chưa có học viên nào"
            hint="Học viên đăng ký tài khoản xong sẽ hiện ở đây."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Không tìm thấy học viên"
            hint={`Không có ai khớp với "${query.trim()}".`}
          />
        ) : (
          <div className="space-y-2">
            {visible.map(({ profile, name, totals }) => {
              const pct = percentOf(
                totals.totalCorrect,
                totals.totalQuestions
              );
              const studied = totals.sessionCount > 0;
              const tone = toneFor(pct);

              return (
                <TappableCard
                  key={profile.id}
                  onClick={() =>
                    router.push(`/admin/students/${profile.id}`)
                  }
                  className="flex items-center gap-3 p-3"
                >
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-blob font-display text-base font-extrabold ${
                      studied ? TONE_BG[tone] : "bg-cloud text-ink-faint"
                    }`}
                  >
                    {studied ? `${pct}%` : "—"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-extrabold text-ink">
                      {name}
                    </p>
                    {studied ? (
                      <>
                        <p className="text-sm font-bold text-ink-soft">
                          {totals.sessionCount} buổi ·{" "}
                          {formatDuration(totals.minutes)} ·{" "}
                          {totals.activeDays} ngày
                        </p>
                        <p className="text-xs font-bold text-ink-faint">
                          Gần nhất {formatDayLabel(totals.lastStudiedAt!)}
                        </p>
                        <ProgressBar
                          percent={pct}
                          tone={tone === "cherry" ? "grape" : tone}
                          className="mt-1.5 h-2"
                          label={`${name}: ${totals.totalCorrect} trên ${totals.totalQuestions} câu đúng`}
                        />
                      </>
                    ) : (
                      <p className="text-sm font-bold text-ink-faint">
                        Chưa có buổi học nào trong khoảng này
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {studied && (
                      <div className="font-display text-base font-extrabold tabular-nums text-ink">
                        {totals.totalCorrect}/{totals.totalQuestions}
                      </div>
                    )}
                    <ChevronRight
                      size={20}
                      strokeWidth={2.5}
                      className="ml-auto text-ink-faint"
                    />
                  </div>
                </TappableCard>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}
