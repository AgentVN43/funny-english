"use client";

import type { ReactNode } from "react";

type Width = "narrow" | "default" | "wide";

const WIDTHS: Record<Width, string> = {
  // Form và luồng học: hẹp cho dễ đọc
  narrow: "max-w-md",
  // Mặc định: mobile hẹp, desktop rộng vừa phải thay vì kẹp cứng 512px
  default: "max-w-md lg:max-w-3xl",
  // Trang chủ, danh sách nhiều cột
  wide: "max-w-md lg:max-w-6xl",
};

/**
 * Khung nội dung mobile-first.
 *
 * Bản cũ kẹp mọi trang trong `max-w-lg` nên trên màn hình rộng chỉ còn một
 * dải hẹp giữa hai vùng trống. Giờ mỗi trang chọn độ rộng theo nội dung.
 */
export function Screen({
  children,
  width = "default",
  className = "",
  id,
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`mx-auto w-full px-4 ${WIDTHS[width]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Vòng quay chờ — thay Spin của antd ở các màn hình học viên */
export function Loader({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <span
        aria-hidden
        className="size-12 animate-spin rounded-full border-4 border-cloud-deep border-t-grape"
      />
      <span className="font-display font-bold text-ink-soft">{label}</span>
    </div>
  );
}

/** Khối xám nhấp nháy giữ chỗ, tránh giật layout khi dữ liệu về */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-blob bg-cloud-deep ${className}`} />
  );
}

/** Màn hình trống có minh hoạ to, thân thiện hơn Empty mặc định */
export function EmptyState({
  emoji = "🌱",
  title,
  hint,
  action,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <span className="anim-float text-6xl" role="img" aria-hidden>
        {emoji}
      </span>
      <p className="font-display text-xl font-extrabold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-ink-soft">{hint}</p>}
      {action}
    </div>
  );
}
