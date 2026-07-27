"use client";

import { Check, X } from "lucide-react";

export type OptionState = "idle" | "correct" | "wrong" | "dimmed";

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

/**
 * Một lựa chọn đáp án: huy hiệu chữ cái tròn màu vàng + chữ đậm trên nền
 * trắng bo tròn, đúng kiểu bố cục trong video khách gửi.
 */
export default function OptionButton({
  index,
  text,
  state = "idle",
  disabled,
  onClick,
}: {
  index: number;
  text: string;
  state?: OptionState;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Đáp án ${OPTION_LETTERS[index] ?? index + 1}: ${text}`}
      className={`btn-push flex w-full items-center gap-3 rounded-pill border-2 py-3 pl-3 pr-4
        text-left min-h-16 ${SHELL[state]}`}
    >
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-full font-display
          text-lg font-extrabold ${BADGE[state]}`}
      >
        {OPTION_LETTERS[index] ?? index + 1}
      </span>

      <span
        className={`flex-1 font-display text-lg font-bold leading-tight wrap-break-word ${TEXT[state]}`}
      >
        {text}
      </span>

      {state === "correct" && (
        <Check size={22} strokeWidth={3} className="shrink-0 text-leaf" />
      )}
      {state === "wrong" && (
        <X size={22} strokeWidth={3} className="shrink-0 text-cherry" />
      )}
    </button>
  );
}
