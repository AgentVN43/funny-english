"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCategories, getTopics, getCards, getProgress } from "@/lib/db";
import type { Category, Topic, Card as CardType } from "@/lib/types";
import { isMastered } from "@/lib/constants";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { Screen, EmptyState, Skeleton } from "@/components/ui/Layout";
import { TappableCard } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";

interface ProgressItem {
  card_id: string;
  streak: number;
  cards: { topic_id: string };
}

interface CategoryGroup {
  category: Category | null;
  topics: Topic[];
}

/** Biểu tượng vui cho từng chủ đề — xoay vòng theo thứ tự để mỗi thẻ một vẻ */
const TOPIC_EMOJI = ["🍎", "🐶", "🚗", "🏠", "🌈", "⚽", "🎨", "🐝", "🍩", "🌻"];

function emojiFor(index: number) {
  return TOPIC_EMOJI[index % TOPIC_EMOJI.length];
}

export default function HomePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [topicCount, setTopicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [topicStatus, setTopicStatus] = useState<
    Record<string, { total: number; mastered: number }>
  >({});

  useEffect(() => {
    // Khách chưa đăng nhập vẫn xem được danh sách chủ đề
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthed(!!session);
      try {
        const [cats, tops, allCards, progress] = await Promise.all([
          getCategories(),
          getTopics(),
          getCards(),
          session
            ? (getProgress(session.user.id) as Promise<ProgressItem[]>)
            : Promise.resolve([] as ProgressItem[]),
        ]);

        const grouped: CategoryGroup[] = cats
          .map((cat) => ({
            category: cat as Category | null,
            topics: tops.filter((t) => t.category_id === cat.id),
          }))
          .filter((g) => g.topics.length > 0);
        const ungrouped = tops.filter(
          (t) => !t.category_id || !cats.some((c) => c.id === t.category_id)
        );
        if (ungrouped.length > 0) {
          grouped.push({ category: null, topics: ungrouped });
        }
        setGroups(grouped);
        setTopicCount(tops.length);

        const cardsByTopic: Record<string, number> = {};
        allCards.forEach((c: CardType) => {
          cardsByTopic[c.topic_id] = (cardsByTopic[c.topic_id] || 0) + 1;
        });

        const masteredByTopic: Record<string, number> = {};
        progress.forEach((p) => {
          if (isMastered(p.streak)) {
            const tId = p.cards?.topic_id;
            if (tId) masteredByTopic[tId] = (masteredByTopic[tId] || 0) + 1;
          }
        });

        const status: Record<string, { total: number; mastered: number }> = {};
        tops.forEach((t) => {
          status[t.id] = {
            total: cardsByTopic[t.id] || 0,
            mastered: masteredByTopic[t.id] || 0,
          };
        });
        setTopicStatus(status);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    });
  }, []);

  /** Chỉ cho vào học khi đã đăng nhập */
  const openTopic = (topicId: string) => {
    if (!authed) {
      router.push(`/login?redirect=${encodeURIComponent(`/learn/${topicId}`)}`);
      return;
    }
    router.push(`/learn/${topicId}`);
  };

  if (loading) {
    return (
      <Screen width="wide" className="py-4">
        <Skeleton className="h-36 w-full" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Screen>
    );
  }

  // Tổng số từ đã thuộc trên toàn bộ chủ đề — dùng cho lời chào
  const totals = Object.values(topicStatus).reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      mastered: acc.mastered + s.mastered,
    }),
    { total: 0, mastered: 0 }
  );

  let topicIndex = 0;

  return (
    <Screen width="wide" className="py-4">
      {/* Lời chào */}
      <section className="overflow-hidden rounded-jumbo bg-grape p-5 text-white lg:p-8">
        <div className="flex items-center gap-4">
          <span className="anim-float text-5xl lg:text-6xl" aria-hidden>
            🦉
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl text-white lg:text-4xl">
              {authed ? "Hôm nay học gì nào?" : "Học tiếng Anh thật vui!"}
            </h1>
            <p className="mt-1 text-sm font-bold text-white/80 lg:text-base">
              {authed
                ? `Bạn đã thuộc ${totals.mastered} trên ${totals.total} từ`
                : "Chọn một chủ đề và bắt đầu ngay, hoàn toàn miễn phí"}
            </p>
          </div>
        </div>

        {authed && totals.total > 0 && (
          <ProgressBar
            percent={(totals.mastered / totals.total) * 100}
            tone="sun"
            className="mt-4"
            label="Tổng số từ đã thuộc"
          />
        )}

        {!authed && (
          <Button
            tone="sun"
            className="mt-4"
            icon={<Sparkles size={18} strokeWidth={2.5} />}
            onClick={() => router.push("/login")}
          >
            Bắt đầu học
          </Button>
        )}
      </section>

      {/* Danh sách chủ đề */}
      {topicCount === 0 ? (
        <EmptyState
          emoji="📚"
          title="Chưa có chủ đề nào"
          hint="Quản trị viên chưa thêm chủ đề học. Quay lại sau nhé!"
        />
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.category?.id || "khac"}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-xl text-ink lg:text-2xl">
                  {group.category?.name || "Chủ đề khác"}
                </h2>
                <span className="text-sm font-bold text-ink-faint">
                  {group.topics.length} chủ đề
                </span>
              </div>
              {group.category?.description && (
                <p className="-mt-2 mb-3 text-sm text-ink-soft">
                  {group.category.description}
                </p>
              )}

              <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
                {group.topics.map((topic) => {
                  const st = topicStatus[topic.id];
                  const total = st?.total ?? 0;
                  const mastered = st?.mastered ?? 0;
                  const done = authed && total > 0 && mastered === total;
                  const pct = total === 0 ? 0 : (mastered / total) * 100;
                  const emoji = emojiFor(topicIndex++);

                  return (
                    <TappableCard
                      key={topic.id}
                      onClick={() => openTopic(topic.id)}
                      className={`p-4 ${done ? "border-leaf bg-leaf-soft" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-14 shrink-0 place-items-center rounded-blob text-3xl ${
                            done ? "bg-leaf/20" : "bg-cloud"
                          }`}
                          aria-hidden
                        >
                          {done ? "🏆" : emoji}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg font-extrabold text-ink">
                            {topic.name}
                          </p>
                          <p className="text-sm font-bold text-ink-soft">
                            {total === 0
                              ? "Chưa có từ vựng"
                              : !authed
                                ? `${total} từ vựng`
                                : done
                                  ? "Đã thuộc hết!"
                                  : `${mastered}/${total} từ đã thuộc`}
                          </p>
                        </div>

                        {done ? (
                          <Check
                            size={24}
                            strokeWidth={3}
                            className="shrink-0 text-leaf"
                          />
                        ) : (
                          <ChevronRight
                            size={22}
                            strokeWidth={2.5}
                            className="shrink-0 text-ink-faint"
                          />
                        )}
                      </div>

                      {authed && total > 0 && !done && (
                        <ProgressBar
                          percent={pct}
                          tone="grape"
                          className="mt-3 h-2.5"
                          label={`${topic.name}: ${mastered} trên ${total} từ`}
                        />
                      )}
                    </TappableCard>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Screen>
  );
}
