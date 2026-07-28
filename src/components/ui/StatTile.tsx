"use client";

import type { ReactNode } from "react";

export type StatTone = "grape" | "sky" | "sun" | "leaf";

const TONE_BG: Record<StatTone, string> = {
  grape: "bg-grape-soft",
  sky: "bg-sky-soft",
  sun: "bg-sun-soft",
  leaf: "bg-leaf-soft",
};

const TONE_TEXT: Record<StatTone, string> = {
  grape: "text-grape",
  sky: "text-sky-dark",
  sun: "text-sun-dark",
  leaf: "text-leaf-dark",
};

/**
 * Ô số liệu tóm tắt. Con số đứng trước nhãn và to gấp đôi, để lướt mắt qua là
 * đọc được ngay mà không cần đọc nhãn.
 */
export default function StatTile({
  icon,
  value,
  label,
  tone = "grape",
}: {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  tone?: StatTone;
}) {
  return (
    <div
      className={`rounded-card p-3 text-center ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
    >
      {icon && <div className="mb-1 flex justify-center">{icon}</div>}
      <div className="font-display text-xl font-extrabold leading-tight tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-bold opacity-80">{label}</div>
    </div>
  );
}
