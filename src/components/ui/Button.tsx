"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonTone = "grape" | "sky" | "sun" | "leaf" | "cherry" | "plain";
export type ButtonSize = "md" | "lg";

/**
 * Nút 3D bấm được: có bóng đặc ở đáy, bấm xuống thì nút lún và bóng mất.
 * Cảm giác "sờ được" này là thứ giữ trẻ bấm tiếp — flat button không có.
 */
const TONES: Record<ButtonTone, string> = {
  grape: "bg-grape text-white [--push-shade:var(--color-grape-dark)]",
  sky: "bg-sky text-white [--push-shade:var(--color-sky-dark)]",
  sun: "bg-sun text-ink [--push-shade:var(--color-sun-dark)]",
  leaf: "bg-leaf text-white [--push-shade:var(--color-leaf-dark)]",
  cherry: "bg-cherry text-white [--push-shade:var(--color-cherry-dark)]",
  plain: "bg-white text-ink [--push-shade:var(--color-cloud-deep)]",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export default function Button({
  tone = "grape",
  size = "lg",
  block = false,
  loading = false,
  icon,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`btn-push inline-flex items-center justify-center gap-2 rounded-pill font-display font-extrabold
        ${TONES[tone]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-5 rounded-full border-[3px] border-white/40 border-t-white animate-spin"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
