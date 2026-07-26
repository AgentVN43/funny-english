"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProgress } from "@/lib/db";
import { Typography, Spin, Empty, message } from "antd";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";
import { isMastered } from "@/lib/constants";

const { Title, Text } = Typography;

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
    topics: {
      id: string;
      name: string;
    };
  };
}

interface TopicGroup {
  topicId: string;
  topicName: string;
  items: ProgressItem[];
}

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        const data = await getProgress(userId);
        setProgress(data as ProgressItem[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        message.error("Lỗi tải dữ liệu: " + msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const grouped: TopicGroup[] = Object.values(
    progress.reduce((acc, item) => {
      const tId = item.cards?.topics?.id || "unknown";
      const tName = item.cards?.topics?.name || "Không có chủ đề";
      if (!acc[tId]) {
        acc[tId] = { topicId: tId, topicName: tName, items: [] };
      }
      acc[tId].items.push(item);
      return acc;
    }, {} as Record<string, TopicGroup>)
  );

  const toggleExpand = (tId: string) => {
    setExpanded((prev) => ({ ...prev, [tId]: !prev[tId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <PageContainer className="py-4">
      <div className="mb-5">
        <Title level={4} className="mb-1">Tiến độ học tập</Title>
        <Text type="secondary">Theo dõi quá trình học từ vựng</Text>
      </div>

      {progress.length === 0 ? (
        <Empty description="Chưa có dữ liệu học tập" />
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const isOpen = expanded[group.topicId] ?? false;
            const masteredCount = group.items.filter((i) =>
              isMastered(i.streak)
            ).length;
            return (
              <div key={group.topicId}>
                {/* Topic header */}
                <button
                  onClick={() => toggleExpand(group.topicId)}
                  className="w-full flex items-center justify-between py-3 px-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown size={18} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-500" />
                    )}
                    <Text strong className="text-base">{group.topicName}</Text>
                    <Text type="secondary" className="text-sm">
                      ({group.items.length} từ)
                    </Text>
                  </div>
                  {masteredCount > 0 && (
                    <Text type="secondary" className="text-sm">
                      Đã thuộc: {masteredCount}/{group.items.length}
                    </Text>
                  )}
                </button>

                {/* Word list */}
                {isOpen && (
                  <div className="ml-2 space-y-1 pb-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <Text strong className="text-base block">
                            {item.cards?.word || "Unknown"}
                          </Text>
                          <Text type="secondary" className="text-sm">
                            {item.cards?.meaning_vi || ""}
                          </Text>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-green-500" />
                            <Text className="text-green-600 text-sm font-medium">
                              {item.correct_count}
                            </Text>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle size={14} className="text-red-500" />
                            <Text className="text-red-500 text-sm font-medium">
                              {item.wrong_count}
                            </Text>
                          </div>
                          {item.streak >= 3 && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Đã thuộc
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div className="border-b border-gray-100" />
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
