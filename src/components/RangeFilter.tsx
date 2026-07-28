"use client";

/** 0 nghĩa là "tất cả", còn lại là số ngày gần đây tính cả hôm nay */
export const RANGES = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 0, label: "Tất cả" },
] as const;

/** Chọn khoảng thời gian cho các số liệu theo dõi học viên */
export default function RangeFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Khoảng thời gian"
      className="flex gap-1 rounded-pill bg-cloud-deep p-1"
    >
      {RANGES.map((r) => (
        <button
          key={r.days}
          role="tab"
          aria-selected={value === r.days}
          onClick={() => onChange(r.days)}
          className={`flex-1 rounded-pill py-2.5 font-display font-extrabold transition-colors ${
            value === r.days ? "bg-white text-grape shadow-sm" : "text-ink-soft"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
