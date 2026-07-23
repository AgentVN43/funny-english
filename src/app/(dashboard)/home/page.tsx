"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCategories, getCards, getProgress } from "@/lib/db";
import type { Category, Card } from "@/lib/types";
import { Typography, Spin, Empty } from "antd";
import { ChevronRight, CheckCircle, Clock } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

interface ProgressItem {
  card_id: string;
  streak: number;
  cards: {
    category_id: string;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryStatus, setCategoryStatus] = useState<
    Record<string, { total: number; mastered: number }>
  >({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      try {
        const [cats, allCards, progress] = await Promise.all([
          getCategories(),
          getCards(),
          getProgress(session.user.id) as Promise<ProgressItem[]>,
        ]);
        setCategories(cats);

        const cardsByCategory: Record<string, number> = {};
        allCards.forEach((c: Card) => {
          cardsByCategory[c.category_id] = (cardsByCategory[c.category_id] || 0) + 1;
        });

        const masteredByCategory: Record<string, number> = {};
        progress.forEach((p) => {
          if (p.streak >= 3) {
            const catId = p.cards?.category_id;
            if (catId) {
              masteredByCategory[catId] = (masteredByCategory[catId] || 0) + 1;
            }
          }
        });

        const status: Record<string, { total: number; mastered: number }> = {};
        cats.forEach((cat) => {
          status[cat.id] = {
            total: cardsByCategory[cat.id] || 0,
            mastered: masteredByCategory[cat.id] || 0,
          };
        });
        setCategoryStatus(status);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

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
        <Title level={4} className="mb-1">
          Chọn chủ đề học
        </Title>
        <Text type="secondary">Chọn một chủ đề để bắt đầu học từ vựng</Text>
      </div>

      {categories.length === 0 ? (
        <Empty description="Chưa có chủ đề nào" />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const st = categoryStatus[cat.id];
            const isMastered = st && st.total > 0 && st.mastered === st.total;
            return (
              <div
                key={cat.id}
                onClick={() => router.push(`/learn/${cat.id}`)}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between active:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isMastered ? "bg-green-100" : "bg-indigo-100"
                  }`}>
                    {isMastered ? (
                      <CheckCircle size={24} className="text-green-600" />
                    ) : (
                      <Clock size={24} className="text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <Text strong className="text-base block">
                      {cat.name}
                    </Text>
                    <Text type="secondary" className="text-sm">
                      {st
                        ? isMastered
                          ? "Đã thuộc"
                          : `${st.mastered}/${st.total} từ đã thuộc`
                        : cat.description || "Học từ vựng theo chủ đề"}
                    </Text>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
