"use client";

import { useEffect, useState } from "react";
import Button, { type ButtonTone } from "@/components/ui/Button";
import Card, { TappableCard } from "@/components/ui/Card";
import OptionButton, { type OptionState } from "@/components/ui/OptionButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { EmptyState, Loader, Screen, Skeleton } from "@/components/ui/Layout";

/**
 * Trang tra cứu design system.
 *
 * Mọi giá trị màu ở đây được ĐỌC TỪ CSS lúc chạy chứ không chép tay, nên
 * trang này không bao giờ lệch với token thật. Sửa globals.css là trang này
 * đổi theo ngay.
 */

const COLOR_GROUPS: { title: string; note: string; names: string[] }[] = [
  {
    title: "Chữ và nền — 60%",
    note: "Chiếm phần lớn diện tích. Chữ dùng navy sâu thay vì đen thuần cho bớt gắt mắt.",
    names: ["ink", "ink-soft", "ink-faint", "cloud", "cloud-deep"],
  },
  {
    title: "Màu chủ đạo — 30%",
    note: "Nhận diện thương hiệu và hành động chính. Biến thể -dark làm bóng nút 3D, -soft làm nền nhạt.",
    names: [
      "grape",
      "grape-dark",
      "grape-soft",
      "sky",
      "sky-dark",
      "sky-soft",
    ],
  },
  {
    title: "Màu nhấn và ngữ nghĩa — 10%",
    note: "Mỗi màu mang một nghĩa cố định, không dùng lẫn: xanh lá = đúng, đỏ = sai, vàng = thưởng.",
    names: [
      "leaf",
      "leaf-dark",
      "leaf-soft",
      "cherry",
      "cherry-dark",
      "cherry-soft",
      "sun",
      "sun-dark",
      "sun-soft",
    ],
  },
];

const RADII = [
  { name: "blob", use: "Ô vuông nhỏ, khối icon" },
  { name: "card", use: "Thẻ nội dung" },
  { name: "pill", use: "Nút bấm, ô nhập, đáp án" },
  { name: "jumbo", use: "Khối lớn như banner chào" },
];

// Phải nằm ngoài component: tạo mới mỗi lần render thì effect bên dưới coi là
// dependency đổi, gọi setState, render lại — thành vòng lặp vô tận.
const COLOR_NAMES = COLOR_GROUPS.flatMap((g) => g.names);
const RADIUS_NAMES = RADII.map((r) => r.name);

/** Đọc giá trị biến CSS thật sau khi đã gắn vào DOM */
function useCssVars(names: string[], prefix: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    // getComputedStyle chỉ chạy được sau khi có DOM, nên buộc phải đặt trong
    // effect và ghi vào state — đây là ngoại lệ hợp lệ của quy tắc dưới.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(() => {
      const styles = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const n of names) {
        next[n] = styles.getPropertyValue(`${prefix}${n}`).trim();
      }
      return next;
    });
  }, [names, prefix]);
  return values;
}

export default function DesignSystemPage() {
  const colors = useCssVars(COLOR_NAMES, "--color-");
  const radii = useCssVars(RADIUS_NAMES, "--radius-");

  const [optionState, setOptionState] = useState<OptionState>("idle");
  const [progress, setProgress] = useState(45);

  return (
    <div className="min-h-dvh bg-cloud pb-20">
      <header className="dotted-bg border-b-2 border-cloud-deep bg-white py-8">
        <Screen width="wide">
          <p className="font-display text-sm font-extrabold uppercase tracking-widest text-grape">
            Funny English
          </p>
          <h1 className="mt-1 text-4xl text-ink">Design System</h1>
          <p className="mt-2 max-w-2xl font-bold text-ink-soft">
            Bảng tra cứu token và component. Màu và bo góc bên dưới được đọc
            trực tiếp từ CSS lúc chạy, nên không bao giờ lệch với code thật.
          </p>
        </Screen>
      </header>

      <Screen width="wide" className="space-y-12 py-10">
        {/* ---------------- MÀU ---------------- */}
        <Section
          title="Màu sắc"
          desc="Theo tỉ lệ 60-30-10: phần lớn là nền trung tính sáng, một màu chủ đạo, và màu nhấn dùng dè."
        >
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="mb-8 last:mb-0">
              <h3 className="text-lg text-ink">{group.title}</h3>
              <p className="mb-3 text-sm text-ink-soft">{group.note}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {group.names.map((name) => (
                  <div key={name}>
                    <div
                      className="h-16 rounded-blob border-2 border-cloud-deep"
                      style={{ background: `var(--color-${name})` }}
                    />
                    <p className="mt-1.5 font-display text-sm font-extrabold text-ink">
                      {name}
                    </p>
                    <p className="font-mono text-xs uppercase text-ink-faint">
                      {colors[name] || "…"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ---------------- CHỮ ---------------- */}
        <Section
          title="Kiểu chữ"
          desc="Baloo 2 cho tiêu đề và nút — nét bo tròn bụ bẫm, hợp trẻ em. Nunito cho nội dung — dễ đọc ở cỡ nhỏ. Cả hai đủ dấu tiếng Việt."
        >
          <div className="space-y-4">
            <TypeRow label="Display / h1" cls="font-display text-4xl font-extrabold" />
            <TypeRow label="Heading / h2" cls="font-display text-2xl font-extrabold" />
            <TypeRow label="Heading / h3" cls="font-display text-lg font-extrabold" />
            <TypeRow label="Body" cls="font-body text-base" />
            <TypeRow label="Body đậm" cls="font-body text-base font-bold" />
            <TypeRow label="Nhỏ" cls="font-body text-sm" />
            <TypeRow label="Rất nhỏ" cls="font-body text-xs" />
          </div>
        </Section>

        {/* ---------------- BO GÓC ---------------- */}
        <Section
          title="Bo góc"
          desc="Càng tròn càng thân thiện. Không dùng góc vuông ở bất kỳ đâu trong khu học viên."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {RADII.map((r) => (
              <div key={r.name} className="text-center">
                <div
                  className="mx-auto grid h-24 w-full place-items-center border-2 border-grape bg-grape-soft"
                  style={{ borderRadius: `var(--radius-${r.name})` }}
                >
                  <span className="font-mono text-sm text-grape">
                    {radii[r.name] || "…"}
                  </span>
                </div>
                <p className="mt-1.5 font-display font-extrabold text-ink">
                  {r.name}
                </p>
                <p className="text-xs text-ink-soft">{r.use}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------- NÚT ---------------- */}
        <Section
          title="Nút bấm"
          desc="Nút 3D có bóng đặc ở đáy. Bấm xuống thì nút lún đúng bằng chiều cao bóng và bóng biến mất — tạo cảm giác sờ được. Hãy bấm thử."
        >
          <div className="space-y-5">
            <div>
              <Label>Tông màu</Label>
              <div className="flex flex-wrap gap-3">
                {(
                  ["grape", "sky", "leaf", "cherry", "sun", "plain"] as ButtonTone[]
                ).map((tone) => (
                  <Button key={tone} tone={tone}>
                    {tone}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Cỡ</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="md">Vừa (48px)</Button>
                <Button size="lg">Lớn (56px)</Button>
              </div>
            </div>

            <div>
              <Label>Trạng thái</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Button>Bình thường</Button>
                <Button loading>Đang chạy</Button>
                <Button disabled>Bị khoá</Button>
                <Button block className="mt-1">
                  Toàn chiều rộng
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- ĐÁP ÁN ---------------- */}
        <Section
          title="Lựa chọn đáp án"
          desc="Thành phần trung tâm của màn hình học. Huy hiệu chữ cái tròn giúp trẻ nhỏ định vị nhanh hơn số thứ tự."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(["idle", "correct", "wrong", "dimmed"] as OptionState[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setOptionState(s)}
                  className={`rounded-full px-4 py-2 font-display text-sm font-extrabold ${
                    optionState === s
                      ? "bg-grape text-white"
                      : "bg-white text-ink-soft"
                  }`}
                >
                  {s}
                </button>
              )
            )}
          </div>
          <div className="max-w-md space-y-3">
            <OptionButton index={0} text="Mulberry" state={optionState} />
            <OptionButton index={1} text="Blueberry" state="idle" />
            <OptionButton index={2} text="Cranberry" state="dimmed" />
          </div>
        </Section>

        {/* ---------------- TIẾN ĐỘ ---------------- */}
        <Section
          title="Thanh tiến độ"
          desc="Dày, bo tròn hết cỡ, có vệt sáng ở nửa trên cho căng mọng."
        >
          <div className="max-w-md space-y-4">
            {(["leaf", "grape", "sun", "sky"] as const).map((tone) => (
              <div key={tone}>
                <p className="mb-1 font-display text-sm font-extrabold text-ink-soft">
                  {tone}
                </p>
                <ProgressBar percent={progress} tone={tone} />
              </div>
            ))}
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-grape"
              aria-label="Kéo để xem thanh tiến độ chạy"
            />
          </div>
        </Section>

        {/* ---------------- THẺ ---------------- */}
        <Section
          title="Thẻ"
          desc="Viền đặc 2px thay cho đổ bóng mờ giúp khối trông chắc chắn hơn."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-lg text-ink">Card</h3>
              <p className="text-ink-soft">Khối tĩnh, không bấm được.</p>
            </Card>
            <TappableCard className="p-5">
              <h3 className="text-lg text-ink">TappableCard</h3>
              <p className="text-ink-soft">
                Nhấc nhẹ khi rê chuột, lún khi bấm. Có hỗ trợ bàn phím.
              </p>
            </TappableCard>
          </div>
        </Section>

        {/* ---------------- TRẠNG THÁI ---------------- */}
        <Section
          title="Trạng thái tải và trống"
          desc="Skeleton giữ chỗ để không giật layout. Màn hình trống có minh hoạ to thay vì dòng chữ khô khan."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <Label>Skeleton</Label>
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
            <div>
              <Label>Loader</Label>
              <div className="rounded-card border-2 border-cloud-deep bg-white">
                <Loader label="Đang tải..." />
              </div>
            </div>
            <div>
              <Label>EmptyState</Label>
              <div className="rounded-card border-2 border-cloud-deep bg-white">
                <EmptyState
                  emoji="📭"
                  title="Chưa có gì ở đây"
                  hint="Dòng gợi ý cho người dùng biết làm gì tiếp."
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- HIỆU ỨNG ---------------- */}
        <Section
          title="Hiệu ứng"
          desc="Bấm vào từng ô để xem. Tất cả đều tự tắt khi người dùng bật chế độ giảm chuyển động của hệ điều hành."
        >
          <AnimationDemos />
        </Section>

        {/* ---------------- CHẠM ---------------- */}
        <Section
          title="Vùng chạm"
          desc="Mọi thứ bấm được đều tối thiểu 44px, nút chính 48-56px. Ngón tay trẻ em kém chính xác hơn người lớn."
        >
          <div className="flex flex-wrap items-end gap-4">
            {[
              { size: "size-11", label: "44px — tối thiểu" },
              { size: "size-12", label: "48px — nút vừa" },
              { size: "size-14", label: "56px — nút chính" },
            ].map((t) => (
              <div key={t.label} className="text-center">
                <div
                  className={`${t.size} grid place-items-center rounded-full border-2 border-dashed border-grape bg-grape-soft`}
                />
                <p className="mt-1 text-xs font-bold text-ink-soft">{t.label}</p>
              </div>
            ))}
          </div>
        </Section>
      </Screen>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl text-ink">{title}</h2>
      <p className="mb-5 mt-1 max-w-2xl text-ink-soft">{desc}</p>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-display text-sm font-extrabold uppercase tracking-wide text-ink-faint">
      {children}
    </p>
  );
}

function TypeRow({ label, cls }: { label: string; cls: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-cloud-deep pb-3">
      <span className="w-32 shrink-0 font-mono text-xs text-ink-faint">
        {label}
      </span>
      <span className={`${cls} text-ink`}>Học tiếng Anh vui nhộn</span>
    </div>
  );
}

/** Bấm để chạy lại hiệu ứng — remount phần tử bằng cách đổi key */
function AnimationDemos() {
  const [keys, setKeys] = useState<Record<string, number>>({});
  const play = (name: string) =>
    setKeys((k) => ({ ...k, [name]: (k[name] ?? 0) + 1 }));

  const demos = [
    { name: "anim-bounce", desc: "Trả lời đúng" },
    { name: "anim-shake", desc: "Trả lời sai" },
    { name: "anim-pop-in", desc: "Thanh phản hồi hiện ra" },
    { name: "anim-slide-in", desc: "Thẻ câu hỏi mới" },
    { name: "anim-float", desc: "Linh vật, biểu tượng trống" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {demos.map((d) => (
        <button
          key={d.name}
          onClick={() => play(d.name)}
          className="rounded-card border-2 border-cloud-deep bg-white p-4 text-center"
        >
          <span
            key={keys[d.name] ?? 0}
            className={`${d.name} block text-4xl`}
            aria-hidden
          >
            🦉
          </span>
          <p className="mt-2 font-mono text-xs text-ink">{d.name}</p>
          <p className="text-xs text-ink-soft">{d.desc}</p>
        </button>
      ))}
    </div>
  );
}
