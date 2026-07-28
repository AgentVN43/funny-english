"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonTone = "plain" | "grape" | "sun";

const TONE: Record<IconButtonTone, string> = {
  plain: "border-2 border-cloud-deep bg-white text-ink-soft hover:text-ink",
  grape: "bg-grape-soft text-grape",
  sun: "bg-sun-soft text-sun-dark",
};

/**
 * Nút tròn chỉ có icon: quay lại, nghe lại, đóng.
 *
 * `label` là bắt buộc — nút không có chữ thì trình đọc màn hình chỉ còn mỗi
 * cái tên này để đọc lên.
 */
export default function IconButton({
  icon,
  label,
  tone = "plain",
  className = "",
  ...rest
}: {
  icon: ReactNode;
  label: string;
  tone?: IconButtonTone;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`grid size-11 shrink-0 place-items-center rounded-full
        transition-transform duration-150 active:scale-90 disabled:opacity-50
        ${TONE[tone]} ${className}`}
    >
      {icon}
    </button>
  );
}
