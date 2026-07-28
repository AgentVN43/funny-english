"use client";

import { Check, X } from "lucide-react";

export type OptionState = "idle" | "correct" | "wrong" | "dimmed";

/**
 * `pill` — đáp án ngắn (một từ). `block` — đáp án là câu dài: khối vuông hơn,
 * cao hơn, chữ nhỏ hơn và huy hiệu căn lên đỉnh để câu xuống dòng vẫn gọn.
 */
export type OptionSize = "pill" | "block";

/** A, B, C, D — trẻ nhỏ đọc chữ cái dễ hơn số thứ tự */
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const SHELL: Record<OptionState, string> = {
  idle: "bg-white border-cloud-deep [--push-shade:var(--color-cloud-deep)]",
  correct: "bg-leaf-soft border-leaf [--push-shade:var(--color-leaf)]",
  wrong: "bg-cherry-soft border-cherry [--push-shade:var(--color-cherry)]",
  dimmed:
    "bg-white border-cloud-deep opacity-45 [--push-shade:var(--color-cloud-deep)]",
};

const BADGE: Record<OptionState, string> = {
  idle: "bg-sun text-ink",
  correct: "bg-leaf text-white",
  wrong: "bg-cherry text-white",
  dimmed: "bg-cloud-deep text-ink-faint",
};

const TEXT: Record<OptionState, string> = {
  idle: "text-ink",
  correct: "text-leaf-dark",
  wrong: "text-cherry-dark",
  dimmed: "text-ink-soft",
};

const SHAPE: Record<OptionSize, string> = {
  pill: "rounded-pill items-center py-3 min-h-16",
  block: "rounded-card items-start py-4 min-h-20",
};

const LABEL: Record<OptionSize, string> = {
  pill: "text-lg leading-tight",
  block: "text-base leading-snug sm:text-lg",
};

/** Icon đúng/sai phải tụt xuống một chút khi khối căn theo đỉnh */
const MARK: Record<OptionSize, string> = {
  pill: "",
  block: "mt-1.5",
};

/**
 * Một lựa chọn đáp án: huy hiệu chữ cái tròn màu vàng + chữ đậm trên nền
 * trắng bo tròn, đúng kiểu bố cục trong video khách gửi.
 */
export default function OptionButton({
  index,
  text,
  state = "idle",
  size = "pill",
  disabled,
  onClick,
}: {
  index: number;
  text: string;
  state?: OptionState;
  size?: OptionSize;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Đáp án ${OPTION_LETTERS[index] ?? index + 1}: ${text}`}
      className={`btn-push flex w-full gap-3 border-2 pl-3 pr-4 text-left
        ${SHAPE[size]} ${SHELL[state]}`}
    >
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-full font-display
          text-lg font-extrabold ${BADGE[state]}`}
      >
        {OPTION_LETTERS[index] ?? index + 1}
      </span>

      <span
        className={`flex-1 font-display font-bold wrap-break-word ${LABEL[size]} ${TEXT[state]}`}
      >
        {text}
      </span>

      {state === "correct" && (
        <Check
          size={22}
          strokeWidth={3}
          className={`shrink-0 text-leaf ${MARK[size]}`}
        />
      )}
      {state === "wrong" && (
        <X
          size={22}
          strokeWidth={3}
          className={`shrink-0 text-cherry ${MARK[size]}`}
        />
      )}
    </button>
  );
}
