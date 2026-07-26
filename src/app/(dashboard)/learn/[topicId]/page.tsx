"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCards } from "@/lib/db";
import { upsertProgress, getUserSettings } from "@/lib/db";
import type { Card } from "@/lib/types";
import {
  Button,
  Typography,
  Spin,
  Progress,
} from "antd";
import {
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import {
  shuffleArray,
  speakText,
  speakFeedback,
  cancelSpeech,
} from "@/lib/utils";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

export default function LearnPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  // Đang đọc phản hồi — chặn sang thẻ tiếp theo cho tới khi đọc xong
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Vào học bắt buộc đăng nhập — quay lại đúng chủ đề sau khi đăng nhập
      if (!session) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/learn/${topicId}`)}`
        );
        return;
      }
      setUserId(session.user.id);
    });
  }, [router, topicId]);

  // Dừng phát âm khi rời trang học
  useEffect(() => cancelSpeech, []);

  useEffect(() => {
    if (!userId || !topicId) return;
    (async () => {
      const settings = await getUserSettings(userId!);
      let allCards = await getCards(topicId);
      allCards = shuffleArray(allCards);
      const limited = allCards.slice(0, settings.cards_per_session);
      setCards(limited);
      setLoading(false);
    })();
  }, [userId, topicId, sessionKey]);

  const options = useMemo(() => {
    if (cards.length === 0 || currentIndex >= cards.length) return [];
    const correct = cards[currentIndex];
    const wrongPool = cards.filter((c) => c.id !== correct.id);
    const shuffled = shuffleArray(wrongPool).slice(0, 3);
    return shuffleArray([
      { id: correct.id, text: correct.word },
      ...shuffled.map((c) => ({ id: c.id, text: c.word })),
    ]);
  }, [currentIndex, cards]);

  const handleAnswer = async (answerId: string) => {
    if (showResult) return;
    setSelectedAnswer(answerId);

    const currentCard = cards[currentIndex];
    const correct = answerId === currentCard.id;
    setIsCorrect(correct);
    setShowResult(true);

    setScore((s) =>
      correct
        ? { ...s, correct: s.correct + 1 }
        : { ...s, wrong: s.wrong + 1 }
    );
    // Khen/nhắc bằng tiếng Việt rồi đọc to từ vựng 3 lần cho cả đúng và sai.
    // Nút "Tiếp theo" chỉ mở sau khi đọc xong.
    setSpeaking(true);
    speakFeedback(correct, currentCard.word, {
      onDone: () => setSpeaking(false),
    });

    if (userId) {
      try {
        await upsertProgress(userId, currentCard.id, correct);
      } catch {}
    }
  };

  const handleNext = () => {
    if (speaking) return;
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowResult(false);
    } else {
      setSessionDone(true);
    }
  };

  const speakWord = (word: string) => {
    speakText(word);
  };

  const restart = () => {
    setSpeaking(false);
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setSessionDone(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);
    setLoading(true);
    setSessionKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <PageContainer className="py-20 text-center">
        <Text>Chủ đề này chưa có thẻ từ vựng nào</Text>
        <div className="mt-4">
          <Button onClick={() => router.push("/home")}>Quay lại</Button>
        </div>
      </PageContainer>
    );
  }

  if (sessionDone) {
    const pct = Math.round(
      (score.correct / (score.correct + score.wrong)) * 100
    );
    return (
      <PageContainer className="py-10 text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <Title level={3}>Hoàn thành!</Title>
          <div className="my-6">
            <Progress
              type="circle"
              percent={pct}
              strokeColor={pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444"}
              size={120}
            />
          </div>
          <div className="flex justify-center gap-8 my-4">
            <div className="text-center">
              <Text className="text-2xl font-bold text-green-500 block">
                {score.correct}
              </Text>
              <Text type="secondary">Đúng</Text>
            </div>
            <div className="text-center">
              <Text className="text-2xl font-bold text-red-500 block">
                {score.wrong}
              </Text>
              <Text type="secondary">Sai</Text>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            <Button
              type="primary"
              size="large"
              block
              icon={<RotateCcw size={18} />}
              onClick={restart}
              className="h-12 rounded-xl"
            >
              Học lại
            </Button>
            <Button
              size="large"
              block
              onClick={() => router.push("/home")}
              className="h-12 rounded-xl"
            >
              Về trang chủ
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPct = ((currentIndex + 1) / cards.length) * 100;

  return (
    <PageContainer className="py-4">
      {/* Top bar: back + progress + score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <Button
            type="text"
            icon={<ArrowLeft size={20} />}
            onClick={() => router.push("/home")}
            className="min-w-[44px] min-h-[44px]"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              <Text className="text-green-600 font-semibold text-sm">{score.correct}</Text>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle size={14} className="text-red-500" />
              <Text className="text-red-600 font-semibold text-sm">{score.wrong}</Text>
            </div>
            <Text type="secondary" className="text-sm font-medium">
              {currentIndex + 1}/{cards.length}
            </Text>
          </div>
        </div>
        <Progress
          percent={Math.round(progressPct)}
          showInfo={false}
          strokeColor="#4f46e5"
          trailColor="#e5e7eb"
          size="small"
        />
      </div>

      {/* Main content: left + right */}
      <div className="flashcard-enter flex flex-col sm:flex-row gap-4">
        {/* Left: image + word + meaning */}
        <div className="sm:w-1/2">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center h-full flex flex-col justify-center">
            {currentCard.image && (
              <img
                src={currentCard.image}
                alt={currentCard.meaning_vi}
                className="max-w-full max-h-48 object-contain rounded-xl mx-auto mb-4"
              />
            )}
            {showResult ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Title level={3} className="mb-0">
                    {currentCard.word}
                  </Title>
                  <button
                    onClick={() => speakWord(currentCard.word)}
                    className="p-2 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors"
                  >
                    <Volume2 size={20} className="text-indigo-600" />
                  </button>
                </div>
                <Text type="secondary" className="text-base">
                  {currentCard.meaning_vi}
                </Text>
                <div className={`mt-3 py-2 px-3 rounded-lg text-sm font-medium ${
                  isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {isCorrect ? "Chính xác!" : `Sai rồi! Đáp án: ${currentCard.word}`}
                </div>
              </>
            ) : currentCard.image ? (
              <Text type="secondary" className="text-base">
                Chọn từ tiếng Anh đúng
              </Text>
            ) : (
              <>
                <Title level={3} className="mb-2">
                  {currentCard.meaning_vi}
                </Title>
                <Text type="secondary" className="text-base">
                  Chọn từ tiếng Anh đúng
                </Text>
              </>
            )}
          </div>
        </div>

        {/* Right: answer options */}
        <div className="sm:w-1/2">
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 content-start">
            {options.map((opt) => {
              const isSelectedAnswer = selectedAnswer === opt.id;
              const isCorrectAnswer = opt.id === currentCard.id;
              let btnClass = "w-full min-h-[52px] py-3 px-4 rounded-xl text-base font-medium border-2 text-left";

              if (showResult) {
                if (isCorrectAnswer) {
                  btnClass += " border-green-500 bg-green-50 text-green-700";
                } else if (isSelectedAnswer && !isCorrectAnswer) {
                  btnClass += " border-red-500 bg-red-50 text-red-700";
                } else {
                  btnClass += " border-gray-200 opacity-50";
                }
              } else {
                btnClass += " border-gray-200 hover:border-indigo-300 active:bg-indigo-50";
              }

              return (
                <button
                  key={opt.id}
                  className={btnClass}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={showResult}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{opt.text}</span>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    )}
                    {showResult && isSelectedAnswer && !isCorrectAnswer && (
                      <XCircle size={18} className="text-red-500 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}

            {/* Next button — chỉ bật sau khi đọc xong từ vựng */}
            {showResult && (
              <Button
                type="primary"
                size="large"
                block
                loading={speaking}
                disabled={speaking}
                onClick={handleNext}
                className="h-12 rounded-xl text-base font-semibold mt-2 pop-in"
              >
                {speaking
                  ? "Đang đọc từ..."
                  : currentIndex < cards.length - 1
                    ? "Tiếp theo"
                    : "Xem kết quả"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
