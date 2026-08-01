"use client";

import { Volume2 } from "lucide-react";
import { DEFAULT_LANGUAGE } from "@/lib/types";
import type { Card as CardType, Language, TopicMode } from "@/lib/types";
import { questionHeading } from "@/lib/question";
import Card from "@/components/ui/Card";
import IconButton from "@/components/ui/IconButton";

interface Props {
  card: CardType;
  mode: TopicMode;
  /** Ngôn ngữ đang học — quyết định chữ "tiếng Anh" hay "tiếng Trung" */
  language?: Language;
  /** Đã chọn đáp án — lộ đáp án ngoại ngữ */
  showResult: boolean;
  onSpeakQuestion: () => void;
  onSpeakAnswer: () => void;
  className?: string;
}

/**
 * Đề bài của một câu hỏi.
 *
 * Hai kiểu bài cần hai bố cục khác hẳn nhau, không phải một bố cục ẩn bớt vài
 * dòng: thẻ từ vựng xoay quanh tấm ảnh nên căn giữa, còn thẻ mẫu câu chỉ có
 * chữ và câu tiếng Việt có thể dài ba dòng — căn giữa sẽ khó dò mắt.
 */
export default function QuestionPanel({
  card,
  mode,
  language = DEFAULT_LANGUAGE,
  showResult,
  onSpeakQuestion,
  onSpeakAnswer,
  className = "",
}: Props) {
  if (mode === "sentence") {
    return (
      <Card className={`anim-slide-in p-5 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-ink-soft">
            {questionHeading("sentence", language)}
          </p>
          <IconButton
            icon={<Volume2 size={20} strokeWidth={2.5} />}
            label="Nghe lại câu hỏi"
            tone="grape"
            onClick={onSpeakQuestion}
          />
        </div>

        <h1 className="mt-2 text-2xl leading-snug text-ink sm:text-3xl">
          “{card.meaning_vi}”
        </h1>

        {showResult && (
          <div className="mt-4 flex items-start gap-2 border-t-2 border-cloud-deep pt-4">
            <p className="flex-1 font-display text-xl font-extrabold leading-snug text-grape">
              {card.word}
            </p>
            <IconButton
              icon={<Volume2 size={20} strokeWidth={2.5} />}
              label={`Nghe lại: ${card.word}`}
              tone="grape"
              onClick={onSpeakAnswer}
            />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={`anim-slide-in p-5 text-center ${className}`}>
      {card.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={card.image}
          alt={card.meaning_vi}
          className="mx-auto mb-4 max-h-52 w-auto rounded-blob object-contain"
        />
      )}

      {/* Nghĩa tiếng Việt luôn hiện — nhiều từ không đoán được qua ảnh */}
      <h1 className="text-3xl leading-tight text-ink">{card.meaning_vi}</h1>

      {showResult ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="font-display text-2xl font-extrabold text-grape">
            {card.word}
          </span>
          <IconButton
            icon={<Volume2 size={20} strokeWidth={2.5} />}
            label={`Nghe lại: ${card.word}`}
            tone="grape"
            onClick={onSpeakAnswer}
          />
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="font-bold text-ink-soft">
            {questionHeading("word", language)}
          </p>
          <IconButton
            icon={<Volume2 size={20} strokeWidth={2.5} />}
            label="Nghe lại câu hỏi"
            tone="grape"
            onClick={onSpeakQuestion}
          />
        </div>
      )}
    </Card>
  );
}
