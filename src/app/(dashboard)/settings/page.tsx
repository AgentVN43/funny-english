"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserSettings, updateUserSettings } from "@/lib/db";
import { changePassword } from "@/lib/auth";
import { message } from "antd";
import { KeyRound, Lock, Minus, Plus, Save } from "lucide-react";
import { Screen, Loader } from "@/components/ui/Layout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { DEFAULT_CARDS_PER_SESSION } from "@/lib/constants";

const MIN_CARDS = 5;
const MAX_CARDS = 50;
/** Các mức hay dùng — bấm một lần thay vì bấm cộng trừ chục lần */
const PRESETS = [5, 10, 20, 40];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardsPerSession, setCardsPerSession] = useState(
    DEFAULT_CARDS_PER_SESSION
  );
  const [userId, setUserId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login?redirect=%2Fsettings");
        return;
      }
      setUserId(session.user.id);
      try {
        const settings = await getUserSettings(session.user.id);
        setCardsPerSession(settings.cards_per_session);
      } catch {
        setCardsPerSession(DEFAULT_CARDS_PER_SESSION);
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const clamp = (v: number) => Math.max(MIN_CARDS, Math.min(MAX_CARDS, v));

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUserSettings(userId, cardsPerSession);
      message.success("Đã lưu cài đặt");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      message.error("Vui lòng nhập đầy đủ mật khẩu mới");
      return;
    }
    if (newPassword.length < 8) {
      message.error("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setChangingPassword(true);
    const { error } = await changePassword(newPassword);
    if (error) {
      message.error(
        error.message.includes("different from the old")
          ? "Mật khẩu mới phải khác mật khẩu cũ"
          : "Lỗi: " + error.message
      );
    } else {
      message.success("Đã đổi mật khẩu thành công");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (loading) return <Loader />;

  return (
    <Screen className="py-4">
      <h1 className="text-2xl text-ink">Cài đặt</h1>
      <p className="mt-1 font-bold text-ink-soft">
        Tùy chỉnh cho vừa sức bạn nhỏ
      </p>

      <div className="mt-5 space-y-4">
        {/* Số thẻ mỗi phiên */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-blob bg-sky-soft text-2xl">
              🎯
            </span>
            <div>
              <h2 className="text-lg text-ink">Số từ mỗi buổi học</h2>
              <p className="text-sm font-bold text-ink-soft">
                Học bao nhiêu từ trong một lần?
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              onClick={() => setCardsPerSession((v) => clamp(v - 5))}
              disabled={cardsPerSession <= MIN_CARDS}
              aria-label="Giảm số từ"
              className="btn-push grid size-12 place-items-center rounded-full bg-white text-ink [--push-shade:var(--color-cloud-deep)] disabled:opacity-40"
            >
              <Minus size={22} strokeWidth={3} />
            </button>

            <div className="text-center">
              <div className="font-display text-5xl font-extrabold text-grape tabular-nums">
                {cardsPerSession}
              </div>
              <div className="text-sm font-bold text-ink-soft">từ</div>
            </div>

            <button
              onClick={() => setCardsPerSession((v) => clamp(v + 5))}
              disabled={cardsPerSession >= MAX_CARDS}
              aria-label="Tăng số từ"
              className="btn-push grid size-12 place-items-center rounded-full bg-white text-ink [--push-shade:var(--color-cloud-deep)] disabled:opacity-40"
            >
              <Plus size={22} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setCardsPerSession(p)}
                className={`rounded-full px-4 py-2 font-display text-sm font-extrabold transition-colors ${
                  cardsPerSession === p
                    ? "bg-grape text-white"
                    : "bg-cloud text-ink-soft hover:bg-cloud-deep"
                }`}
              >
                {p} từ
              </button>
            ))}
          </div>

          <Button
            block
            className="mt-5"
            loading={saving}
            icon={<Save size={20} strokeWidth={2.5} />}
            onClick={handleSave}
          >
            Lưu cài đặt
          </Button>
        </Card>

        {/* Đổi mật khẩu */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-blob bg-sun-soft text-2xl">
              🔐
            </span>
            <div>
              <h2 className="text-lg text-ink">Đổi mật khẩu</h2>
              <p className="text-sm font-bold text-ink-soft">Ít nhất 8 ký tự</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PasswordField
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={setNewPassword}
            />
            <PasswordField
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              onEnter={handleChangePassword}
            />
            <Button
              block
              tone="sky"
              loading={changingPassword}
              icon={<KeyRound size={20} strokeWidth={2.5} />}
              onClick={handleChangePassword}
            >
              Đổi mật khẩu
            </Button>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{placeholder}</span>
      <div className="flex items-center gap-3 rounded-pill border-2 border-cloud-deep bg-cloud px-4 focus-within:border-grape">
        <Lock size={20} className="shrink-0 text-ink-faint" />
        <input
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="w-full bg-transparent py-3.5 font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
        />
      </div>
    </label>
  );
}
