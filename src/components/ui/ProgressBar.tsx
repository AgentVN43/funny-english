"use client";

/**
 * Thanh tiến độ dày, bo tròn hết cỡ — kiểu thanh trong video khách gửi.
 * Có vệt sáng ở nửa trên để trông căng mọng thay vì phẳng lì.
 */
export default function ProgressBar({
  percent,
  tone = "leaf",
  className = "",
  label,
}: {
  percent: number;
  tone?: "leaf" | "grape" | "sun" | "sky";
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const fill = {
    leaf: "bg-leaf",
    grape: "bg-grape",
    sun: "bg-sun",
    sky: "bg-sky",
  }[tone];

  return (
    <div
      className={`h-4 w-full overflow-hidden rounded-full bg-cloud-deep ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Tiến độ"}
    >
      <div
        className={`relative h-full rounded-full ${fill} transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      >
        <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-white/35" />
      </div>
    </div>
  );
}
