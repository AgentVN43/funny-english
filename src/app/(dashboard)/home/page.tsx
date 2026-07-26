"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCategories, getTopics, getCards, getProgress } from "@/lib/db";
import type { Category, Topic, Card } from "@/lib/types";
import { isMastered } from "@/lib/constants";
import { Typography, Spin, Empty, Carousel, Button, message } from "antd";
import {
  ChevronRight,
  CheckCircle,
  Clock,
  BookOpen,
  Sparkles,
  Trophy,
  LogOut,
  LogIn,
  Mail,
  Phone,
} from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

interface ProgressItem {
  card_id: string;
  streak: number;
  cards: {
    topic_id: string;
  };
}

interface CategoryGroup {
  category: Category | null;
  topics: Topic[];
}

const banners = [
  {
    title: "Học tiếng Anh vui nhộn",
    subtitle: "Flashcards sinh động theo từng chủ đề, học mọi lúc mọi nơi",
    gradient: "from-indigo-500 to-purple-600",
    icon: BookOpen,
  },
  {
    title: "Luyện tập mỗi ngày",
    subtitle: "Trả lời đúng 3 lần liên tiếp để thuộc từ vựng",
    gradient: "from-purple-500 to-pink-500",
    icon: Sparkles,
  },
  {
    title: "Theo dõi tiến độ",
    subtitle: "Xem số từ đã thuộc và chuỗi trả lời đúng của bạn",
    gradient: "from-blue-500 to-indigo-600",
    icon: Trophy,
  },
];

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

        // Nhóm topics theo category
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
        allCards.forEach((c: Card) => {
          cardsByTopic[c.topic_id] = (cardsByTopic[c.topic_id] || 0) + 1;
        });

        const masteredByTopic: Record<string, number> = {};
        progress.forEach((p) => {
          if (isMastered(p.streak)) {
            const tId = p.cards?.topic_id;
            if (tId) {
              masteredByTopic[tId] = (masteredByTopic[tId] || 0) + 1;
            }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    message.success("Đã đăng xuất");
    setAuthed(false);
    router.refresh();
  };

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop landing navbar */}
      <nav className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={26} className="text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">
              Funny English
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a
              href="#trang-chu"
              className="text-sm font-medium text-indigo-600"
            >
              Trang chủ
            </a>
            <a
              href="#gioi-thieu"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Giới thiệu
            </a>
            <a
              href="#lien-he"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Liên hệ
            </a>
          </div>
          {authed ? (
            <Button
              type="text"
              danger
              icon={<LogOut size={16} />}
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<LogIn size={16} />}
              onClick={() => router.push("/login")}
              className="rounded-xl"
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </nav>

      <PageContainer wide className="py-4 lg:py-8" id="trang-chu">
      {/* Banner slider — desktop only */}
      <div className="hidden lg:block mb-10 rounded-3xl overflow-hidden shadow-md">
        <Carousel autoplay autoplaySpeed={4500} dots>
          {banners.map((banner) => {
            const Icon = banner.icon;
            return (
              <div key={banner.title}>
                <div
                  className={`bg-gradient-to-r ${banner.gradient} h-64 flex items-center justify-center`}
                >
                  <div className="flex items-center gap-8 px-12">
                    <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center shrink-0">
                      <Icon size={48} className="text-white" />
                    </div>
                    <div>
                      <div className="text-white text-3xl font-bold mb-2">
                        {banner.title}
                      </div>
                      <div className="text-white/85 text-lg">
                        {banner.subtitle}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Carousel>
      </div>

      {/* Section heading */}
      <div className="mb-5 lg:mb-6 lg:text-center">
        <Title level={4} className="mb-1 lg:!text-2xl">
          Chọn chủ đề học
        </Title>
        <Text type="secondary">Chọn một chủ đề để bắt đầu học từ vựng</Text>
      </div>

      {/* Topics nhóm theo categories: list trên mobile, grid trên desktop */}
      {topicCount === 0 ? (
        <Empty description="Chưa có chủ đề nào" />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.category?.id || "khac"}>
              <div className="mb-3">
                <Text strong className="text-lg lg:text-xl">
                  {group.category?.name || "Khác"}
                </Text>
                {group.category?.description && (
                  <Text type="secondary" className="block text-sm">
                    {group.category.description}
                  </Text>
                )}
              </div>
              <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-5">
                {group.topics.map((topic) => {
                  const st = topicStatus[topic.id];
                  const isMastered =
                    authed && st && st.total > 0 && st.mastered === st.total;
                  // Khách chưa đăng nhập: hiện số từ, không hiện tiến độ
                  const subtitle = !authed
                    ? st && st.total > 0
                      ? `${st.total} từ vựng`
                      : topic.description || "Học từ vựng theo chủ đề"
                    : st
                      ? isMastered
                        ? "Đã thuộc"
                        : `${st.mastered}/${st.total} từ đã thuộc`
                      : topic.description || "Học từ vựng theo chủ đề";
                  return (
                    <div
                      key={topic.id}
                      onClick={() => openTopic(topic.id)}
                      className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            isMastered ? "bg-green-100" : "bg-indigo-100"
                          }`}
                        >
                          {isMastered ? (
                            <CheckCircle size={24} className="text-green-600" />
                          ) : (
                            <Clock size={24} className="text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <Text strong className="text-base block">
                            {topic.name}
                          </Text>
                          <Text type="secondary" className="text-sm">
                            {subtitle}
                          </Text>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </PageContainer>

      {/* Giới thiệu — desktop only */}
      <section id="gioi-thieu" className="hidden lg:block bg-white mt-16 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Title level={3} className="mb-3">
            Giới thiệu
          </Title>
          <Text type="secondary" className="text-base block max-w-2xl mx-auto">
            Funny Learn English giúp bạn học từ vựng tiếng Anh qua flashcards
            sinh động theo từng chủ đề. Trả lời đúng 3 lần liên tiếp để thuộc
            một từ, kèm phát âm chuẩn và theo dõi tiến độ học tập mỗi ngày.
          </Text>
          <div className="grid grid-cols-3 gap-8 mt-10 max-w-3xl mx-auto">
            {[
              { icon: BookOpen, label: "Flashcards theo chủ đề" },
              { icon: Sparkles, label: "Phát âm chuẩn tự động" },
              { icon: Trophy, label: "Theo dõi tiến độ" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <Icon size={28} className="text-indigo-600" />
                </div>
                <Text strong>{label}</Text>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Liên hệ — desktop only footer */}
      <footer id="lien-he" className="hidden lg:block bg-gray-900 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen size={22} className="text-indigo-400" />
            <span className="text-lg font-bold text-white">Funny English</span>
          </div>
          <div className="flex items-center justify-center gap-8 text-gray-400 text-sm">
            <span className="flex items-center gap-2">
              <Mail size={16} />
              annk.teachai@gmail.com
            </span>
            <span className="flex items-center gap-2">
              <Phone size={16} />
              Liên hệ qua email để được hỗ trợ
            </span>
          </div>
          <Text className="block !text-gray-500 text-xs mt-6">
            © 2026 Funny Learn English
          </Text>
        </div>
      </footer>
    </>
  );
}
