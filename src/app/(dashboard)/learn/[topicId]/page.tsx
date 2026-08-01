"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCards,
  getExtraDistractorCards,
  getTopicById,
  getTopicLanguage,
  getTopicProgress,
  getUserSettings,
  startStudySession,
  updateStudySession,
  upsertProgress,
} from "@/lib/db";
import { DEFAULT_LANGUAGE } from "@/lib/types";
import type { Card as CardType, Language, Topic } from "@/lib/types";
import type { CardProgress, ProgressMap } from "@/lib/session";
import { buildOptions, selectSessionCards } from "@/lib/session";
import { buildQuestionText, SPEECH_LANG } from "@/lib/question";
import { PendingSaveQueue } from "@/lib/pendingSaves";
import {
  ANSWER_SPEAK_TIMES,
  DEFAULT_CARDS_PER_SESSION,
  OPTION_COUNT,
} from "@/lib/constants";
import { ArrowLeft, CloudOff, RotateCcw } from "lucide-react";
import { cancelSpeech, speakText, speakTimes } from "@/lib/utils";
import { Screen, Loader, EmptyState } from "@/components/ui/Layout";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import QuestionPanel from "@/components/QuestionPanel";
import OptionButton, {
  OPTION_LETTERS,
  type OptionState,
} from "@/components/ui/OptionButton";

export default function LearnPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const router = useRouter();

  // Toàn bộ thẻ của chủ đề — nguồn dựng đáp án nhiễu (KHÔNG phải thẻ của phiên)
  const [allCards, setAllCards] = useState<CardType[]>([]);
  // Thẻ mượn từ chủ đề khác, chỉ dùng khi chủ đề này quá ít thẻ
  const [extraPool, setExtraPool] = useState<CardType[]>([]);
  // Thẻ được chọn cho phiên học này
  const [cards, setCards] = useState<CardType[]>([]);

  // Giữ cả chủ đề chứ không riêng tên: kiểu bài và mẫu câu hỏi nằm ở đây
  const [topic, setTopic] = useState<Topic | null>(null);
  // Ngôn ngữ đang học, suy từ category của chủ đề — quyết định giọng đọc đáp án
  // và chữ "tiếng Anh"/"tiếng Trung" trong câu hỏi
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  // Câu trả lời chưa lưu được — giữ trong ref để retry không bị stale closure
  const pendingRef = useRef(new PendingSaveQueue());
  const [pendingCount, setPendingCount] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Buổi học đang ghi: id dòng study_sessions và số liệu cộng dồn.
  // Dùng ref vì cần giá trị mới nhất ngay trong handler, không đợi re-render.
  const studySessionRef = useRef<{
    id: string | null;
    total: number;
    correct: number;
    wrong: number;
  }>({ id: null, total: 0, correct: 0, wrong: 0 });
  const topicNameRef = useRef("");
  // Lời gọi tạo dòng đang bay — chặn hai câu trả lời sát nhau tạo hai buổi học
  const creatingSessionRef = useRef<Promise<string> | null>(null);

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const incorrectSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Vào học bắt buộc đăng nhập — quay lại đúng chủ đề sau khi đăng nhập
      if (!session) {
        router.replace(
          `/login?redirect=${encodeURIComponent(`/learn/${topicId}`)}`,
        );
        return;
      }
      setUserId(session.user.id);
      correctSoundRef.current = new Audio("/correct_sound.mp3");
      incorrectSoundRef.current = new Audio("/incorrect_sound.mp3");
    });
  }, [router, topicId]);

  // Dừng phát âm khi rời trang học
  useEffect(() => cancelSpeech, []);

  useEffect(() => {
    if (!userId || !topicId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      // Mỗi lần vào học (kể cả bấm Học lại) là một buổi học mới
      studySessionRef.current = { id: null, total: 0, correct: 0, wrong: 0 };
      creatingSessionRef.current = null;
      try {
        // Thiếu cài đặt hoặc thiếu tiến độ không được làm hỏng cả phiên học
        const [settings, topicCards, progressRows, topicRow, topicLanguage] =
          await Promise.all([
            getUserSettings(userId).catch(() => ({
              cards_per_session: DEFAULT_CARDS_PER_SESSION,
            })),
            getCards(topicId),
            getTopicProgress(userId, topicId).catch(() => [] as CardProgress[]),
            getTopicById(topicId).catch(() => null),
            getTopicLanguage(topicId).catch(() => DEFAULT_LANGUAGE),
          ]);
        if (cancelled) return;

        topicNameRef.current = topicRow?.name ?? "";
        setTopic(topicRow);
        setLanguage(topicLanguage);

        const progress: ProgressMap = {};
        for (const row of progressRows) progress[row.card_id] = row;

        // Chủ đề ít thẻ thì mượn thêm thẻ chủ đề khác để đủ số lựa chọn.
        // Lấy ngay tại đây để đáp án không bị trộn lại giữa chừng.
        const extra =
          topicCards.length < OPTION_COUNT
            ? await getExtraDistractorCards(topicId).catch(
                () => [] as CardType[],
              )
            : [];
        if (cancelled) return;

        setAllCards(topicCards);
        setExtraPool(extra);
        setCards(
          selectSessionCards(topicCards, progress, settings.cards_per_session),
        );
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Không tải được dữ liệu",
        );
      } finally {
        // Luôn tắt loading — trước đây lỗi ở đây làm màn hình quay mãi
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, topicId, sessionKey]);

  /** Nguồn đáp án nhiễu: cả chủ đề, mượn thêm chủ đề khác khi cần */
  const distractorPool = useMemo(
    () => [...allCards, ...extraPool],
    [allCards, extraPool],
  );

  const currentCard: CardType | undefined = cards[currentIndex];

  const options = useMemo(() => {
    if (!currentCard) return [];
    return buildOptions(currentCard, distractorPool);
  }, [currentCard, distractorPool]);

  const mode = topic?.mode ?? "word";

  /** Câu hỏi đọc lên bằng tiếng Việt cho thẻ đang hiện */
  const questionText = useMemo(
    () =>
      currentCard
        ? buildQuestionText(currentCard, mode, topic?.question_prompt, language)
        : "",
    [currentCard, mode, topic?.question_prompt, language],
  );

  const speakQuestion = useCallback(() => {
    if (questionText) speakText(questionText, "vi-VN");
  }, [questionText]);

  /** Đọc đáp án đúng vài lần — nghe lặp lại thì nhớ mặt chữ lâu hơn */
  const speakAnswer = useCallback(
    (word: string) => {
      speakTimes(word, {
        times: ANSWER_SPEAK_TIMES,
        lang: SPEECH_LANG[language],
      });
    },
    [language],
  );

  /**
   * Đọc câu hỏi một lần mỗi khi sang thẻ mới.
   *
   * Vào học bằng cách bấm chủ đề nên trình duyệt đã có thao tác người dùng và
   * cho phép phát tiếng. Tải thẳng URL rồi F5 thì lượt đọc đầu bị chặn im lặng
   * — vì vậy cạnh câu hỏi luôn có nút loa để nghe lại.
   */
  useEffect(() => {
    if (loading || sessionDone || !questionText) return;
    speakText(questionText, "vi-VN");
  }, [questionText, loading, sessionDone]);

  /** Ghi kết quả lên server; thất bại thì xếp hàng chờ thử lại */
  const saveAnswer = useCallback(
    async (uid: string, cardId: string, correct: boolean) => {
      try {
        await upsertProgress(uid, cardId, correct);
      } catch {
        pendingRef.current.add({ cardId, correct });
        setPendingCount(pendingRef.current.size);
      }
    },
    [],
  );

  /**
   * Ghi lịch sử buổi học. Dòng chỉ được tạo ở câu trả lời ĐẦU TIÊN nên người
   * chỉ mở ra xem rồi thoát không sinh dữ liệu rác. Mỗi câu sau đó cập nhật
   * `ended_at`, nhờ vậy buổi bỏ dở vẫn có khoảng thời gian đúng.
   */
  const recordStudySession = useCallback(
    async (uid: string, correct: boolean) => {
      const s = studySessionRef.current;
      s.total += 1;
      if (correct) s.correct += 1;
      else s.wrong += 1;

      try {
        if (!s.id && !creatingSessionRef.current) {
          const p = startStudySession(
            uid,
            topicId,
            topicNameRef.current,
            correct,
          );
          creatingSessionRef.current = p;
          // Hỏng thì xoá cờ để câu sau còn tạo lại được
          p.catch(() => {
            creatingSessionRef.current = null;
          });
          s.id = await p;
          return; // dòng vừa tạo đã mang số liệu của chính câu này
        }
        if (!s.id && creatingSessionRef.current) {
          s.id = await creatingSessionRef.current;
        }
        if (!s.id) return;
        await updateStudySession(s.id, {
          total: s.total,
          correct: s.correct,
          wrong: s.wrong,
        });
      } catch {
        // Lịch sử là số liệu phụ — hỏng thì bỏ qua, không cản việc học
      }
    },
    [topicId],
  );

  const retryPending = useCallback(async () => {
    if (!userId || pendingRef.current.size === 0) return;
    setRetrying(true);
    const remaining = await pendingRef.current.flush((item) =>
      upsertProgress(userId, item.cardId, item.correct).then(() => undefined),
    );
    setPendingCount(remaining);
    setRetrying(false);
  }, [userId]);

  const handleAnswer = (answerId: string) => {
    if (showResult || !currentCard) return;
    setSelectedAnswer(answerId);

    const correct = answerId === currentCard.id;
    setIsCorrect(correct);
    setShowResult(true);

    setScore((s) =>
      correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 },
    );

    // Đọc to đáp án đúng, cho cả câu trả lời đúng lẫn sai
    // speakAnswer(currentCard.word);

    if (correct) {
      const sound = correctSoundRef.current;
      if (sound) {
        sound.currentTime = 0; // Reset về đầu nếu user click liên tục
        sound.play();
        sound.onended = () => {
          speakAnswer(currentCard.word);
        };
      }
    } else {
      const sound = incorrectSoundRef.current;
      if (sound) {
        sound.currentTime = 0; // Reset về đầu nếu user click liên tục
        sound.play();
        sound.onended = () => {
          speakAnswer(currentCard.word);
        };
      }
    }

    if (userId) {
      void saveAnswer(userId, currentCard.id, correct);
      void recordStudySession(userId, correct);
    }
  };

  const handleNext = useCallback(() => {
    // Cắt tiếng đang đọc dở — trẻ bấm tiếp là muốn đi ngay, không phải chờ hết 3 lượt
    cancelSpeech();
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowResult(false);
    } else {
      setSessionDone(true);
      void retryPending();
    }
  }, [currentIndex, cards.length, retryPending]);

  // Phím tắt: 1-4 chọn đáp án, Enter sang câu tiếp
  useEffect(() => {
    if (loading || sessionDone || !currentCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Enter/Space trên phần tử đang focus đã được trình duyệt xử lý sẵn —
      // xử lý thêm ở đây sẽ nhảy 2 thẻ một lúc
      const el = e.target as HTMLElement | null;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "BUTTON" ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing && (e.key === "Enter" || e.key === " ")) return;

      if (e.key >= "1" && e.key <= String(options.length)) {
        const opt = options[Number(e.key) - 1];
        if (opt) {
          e.preventDefault();
          handleAnswer(opt.id);
        }
        return;
      }
      if (e.key === "Enter" && showResult) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sessionDone, currentCard, options, showResult, handleNext]);

  const restart = () => {
    cancelSpeech();
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setSessionDone(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowResult(false);
    setLoading(true);
    setSessionKey((k) => k + 1);
  };

  if (loading) return <Loader label="Đang chuẩn bị bài học..." />;

  if (loadError) {
    return (
      <Screen width="narrow" className="py-10">
        <EmptyState
          emoji="😵"
          title="Không tải được bài học"
          hint={loadError}
          action={
            <div className="mt-2 flex gap-3">
              <Button onClick={restart}>Thử lại</Button>
              <Button tone="plain" onClick={() => router.push("/home")}>
                Quay lại
              </Button>
            </div>
          }
        />
      </Screen>
    );
  }

  if (cards.length === 0) {
    return (
      <Screen width="narrow" className="py-10">
        <EmptyState
          emoji="📭"
          title="Chủ đề này chưa có từ nào"
          hint="Hãy chọn một chủ đề khác để bắt đầu học nhé!"
          action={
            <Button className="mt-2" onClick={() => router.push("/home")}>
              Về trang chủ
            </Button>
          }
        />
      </Screen>
    );
  }

  // ---------------------------------------------------------------
  // Màn hình kết quả
  // ---------------------------------------------------------------
  if (sessionDone) {
    const answered = score.correct + score.wrong;
    const pct =
      answered === 0 ? 0 : Math.round((score.correct / answered) * 100);
    const cheer =
      pct >= 80
        ? { emoji: "🏆", title: "Xuất sắc!", tone: "leaf" as const }
        : pct >= 50
          ? { emoji: "👍", title: "Khá lắm!", tone: "sun" as const }
          : { emoji: "💪", title: "Cố lên nhé!", tone: "sky" as const };

    return (
      <Screen width="narrow" className="py-8">
        <Card className="anim-pop-in overflow-hidden p-6 text-center">
          <span className="anim-float block text-7xl" role="img" aria-hidden>
            {cheer.emoji}
          </span>
          <h2 className="mt-3 text-3xl text-ink">{cheer.title}</h2>
          <p className="mt-1 text-ink-soft">{topic?.name ?? ""}</p>

          <div className="my-6">
            <div className="font-display text-6xl font-extrabold text-grape">
              {pct}%
            </div>
            <ProgressBar
              percent={pct}
              tone={cheer.tone}
              className="mt-3"
              label="Tỉ lệ trả lời đúng"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-leaf-soft p-4">
              <div className="font-display text-3xl font-extrabold text-leaf-dark">
                {score.correct}
              </div>
              <div className="text-sm font-bold text-leaf-dark">Câu đúng</div>
            </div>
            <div className="rounded-card bg-cherry-soft p-4">
              <div className="font-display text-3xl font-extrabold text-cherry-dark">
                {score.wrong}
              </div>
              <div className="text-sm font-bold text-cherry-dark">Câu sai</div>
            </div>
          </div>

          {pendingCount > 0 && (
            <OfflineNotice
              count={pendingCount}
              retrying={retrying}
              onRetry={retryPending}
              className="mt-4"
            />
          )}

          <div className="mt-6 space-y-3">
            <Button
              block
              icon={<RotateCcw size={20} strokeWidth={2.5} />}
              onClick={restart}
            >
              Học lại
            </Button>
            <Button block tone="plain" onClick={() => router.push("/home")}>
              Về trang chủ
            </Button>
          </div>
        </Card>
      </Screen>
    );
  }

  if (!currentCard) return null;

  const progressPct = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="dotted-bg min-h-dvh pb-40">
      <Screen width="default" className="py-3">
        {/* Thanh trên: quay lại + tiến độ + điểm */}
        <div className="flex items-center gap-3">
          <IconButton
            icon={<ArrowLeft size={20} strokeWidth={2.5} />}
            label="Quay lại trang chủ"
            onClick={() => router.push("/home")}
          />

          <ProgressBar
            percent={progressPct}
            tone="leaf"
            className="flex-1"
            label={`Câu ${currentIndex + 1} trên ${cards.length}`}
          />

          <span className="shrink-0 font-display text-base font-extrabold text-ink-soft tabular-nums">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <ScoreChip tone="leaf" value={score.correct} label="đúng" />
          <ScoreChip tone="cherry" value={score.wrong} label="sai" />
        </div>

        {pendingCount > 0 && (
          <OfflineNotice
            count={pendingCount}
            retrying={retrying}
            onRetry={retryPending}
            className="mt-3"
          />
        )}

        {/*
          Đề bài trên, đáp án dưới. Từ vựng tách hai cột trên máy tính cho ảnh
          và đáp án cùng tầm mắt; mẫu câu giữ một cột vì câu dài đọc theo chiều
          dọc dễ hơn.
        */}
        <div
          className={`mt-4 ${
            mode === "sentence"
              ? "mx-auto max-w-2xl"
              : "lg:flex lg:items-start lg:gap-6"
          }`}
        >
          <QuestionPanel
            key={currentCard.id}
            card={currentCard}
            mode={mode}
            language={language}
            showResult={showResult}
            onSpeakQuestion={speakQuestion}
            onSpeakAnswer={() => speakAnswer(currentCard.word)}
            className={`${mode === "sentence" ? "" : "lg:flex-1"} ${
              showResult ? (isCorrect ? "anim-bounce" : "anim-shake") : ""
            }`}
          />

          {/* Đáp án */}
          <div
            className={`mt-4 space-y-3 ${
              mode === "sentence" ? "" : "lg:mt-0 lg:flex-1"
            }`}
          >
            {options.map((opt, i) => {
              let state: OptionState = "idle";
              if (showResult) {
                if (opt.id === currentCard.id) state = "correct";
                else if (opt.id === selectedAnswer) state = "wrong";
                else state = "dimmed";
              }
              return (
                <OptionButton
                  key={opt.id}
                  index={i}
                  text={opt.text}
                  state={state}
                  size={mode === "sentence" ? "block" : "pill"}
                  disabled={showResult}
                  onClick={() => handleAnswer(opt.id)}
                />
              );
            })}
          </div>
        </div>
      </Screen>

      {/* Thanh phản hồi dính đáy — luôn trong tầm ngón tay cái */}
      {showResult && (
        <div
          className={`anim-pop-in fixed inset-x-0 bottom-0 z-40 border-t-4 pb-[max(1rem,var(--safe-bottom))] pt-4 ${
            isCorrect
              ? "border-leaf bg-leaf-soft"
              : "border-cherry bg-cherry-soft"
          }`}
        >
          <Screen width="default">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`font-display text-xl font-extrabold ${
                    isCorrect ? "text-leaf-dark" : "text-cherry-dark"
                  }`}
                >
                  {isCorrect ? "🎉 Chính xác!" : "😅 Chưa đúng rồi"}
                </p>
                {/*
                  Chỉ nhắc đáp án cho thẻ từ vựng. Câu giao tiếp dài, nhét vào
                  thanh này chỉ còn một dòng cắt cụt — mà đề bài phía trên đã
                  hiện đủ cả câu rồi.
                */}
                {!isCorrect && mode === "word" && (
                  <p className="truncate text-sm font-bold text-cherry-dark">
                    Đáp án: {currentCard.word}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  tone={isCorrect ? "leaf" : "cherry"}
                  onClick={handleNext}
                >
                  {currentIndex < cards.length - 1
                    ? "Tiếp theo"
                    : "Xem kết quả"}
                </Button>
              </div>
            </div>
          </Screen>
        </div>
      )}

      {/* Gợi ý phím tắt — chỉ hiện trên máy tính */}
      {!showResult && (
        <p className="mt-6 hidden text-center text-sm text-ink-faint lg:block">
          Mẹo: bấm phím {OPTION_LETTERS.slice(0, options.length).join(", ")}{" "}
          tương ứng 1–{options.length} để chọn nhanh
        </p>
      )}
    </div>
  );
}

/** Chip điểm nhỏ ở góc phải thanh tiến độ */
function ScoreChip({
  tone,
  value,
  label,
}: {
  tone: "leaf" | "cherry";
  value: number;
  label: string;
}) {
  const styles =
    tone === "leaf"
      ? "bg-leaf-soft text-leaf-dark"
      : "bg-cherry-soft text-cherry-dark";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-display text-sm font-extrabold ${styles}`}
    >
      {value}
      <span className="font-body text-xs font-bold opacity-80">{label}</span>
    </span>
  );
}

/** Cảnh báo chưa lưu được kết quả (mất mạng) */
function OfflineNotice({
  count,
  retrying,
  onRetry,
  className = "",
}: {
  count: number;
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card border-2 border-sun bg-sun-soft p-3 ${className}`}
    >
      <CloudOff size={22} className="shrink-0 text-sun-dark" />
      <p className="flex-1 text-sm font-bold text-ink">
        Chưa lưu được {count} câu trả lời
      </p>
      <button
        onClick={onRetry}
        disabled={retrying}
        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-ink disabled:opacity-50"
      >
        {retrying ? "Đang lưu..." : "Thử lại"}
      </button>
    </div>
  );
}
