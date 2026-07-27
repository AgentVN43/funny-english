"use client";

import type { HTMLAttributes } from "react";

/**
 * Khối trắng bo tròn có viền dày — nền tảng của mọi màn hình.
 * Viền đặc thay cho đổ bóng mờ giúp khối trông "chắc", hợp phong cách trẻ em.
 */
export default function Card({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`rounded-card border-2 border-cloud-deep bg-white ${className}`}
    >
      {children}
    </div>
  );
}

/** Thẻ bấm được: nhấc nhẹ khi hover, lún xuống khi bấm */
export function TappableCard({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
      className={`rounded-card border-2 border-cloud-deep bg-white cursor-pointer
        transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 ${className}`}
    >
      {children}
    </div>
  );
}
