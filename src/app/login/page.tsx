"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  loginWithPhone,
  registerWithPhone,
  isValidPhone,
  DEFAULT_PASSWORD,
} from "@/lib/auth";
import { message } from "antd";
import { ArrowLeft, Lock, LogIn, User, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Loader } from "@/components/ui/Layout";

/** Chỉ cho phép đường dẫn nội bộ để tránh open redirect */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  // Học viên đăng nhập bằng SĐT, tài khoản quản trị bằng email — chung một ô
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id || !password) {
      message.error("Vui lòng nhập số điện thoại (hoặc email) và mật khẩu");
      return;
    }
    if (!id.includes("@") && !isValidPhone(id)) {
      message.error("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }
    setLoading(true);
    const { data, error } = await loginWithPhone(id, password);
    if (error) {
      message.error(
        error.message === "Invalid login credentials"
          ? "Tài khoản hoặc mật khẩu không đúng"
          : error.message
      );
      setLoading(false);
      return;
    }
    if (!data.session) {
      message.error("Đăng nhập không thành công");
      setLoading(false);
      return;
    }
    let role = "user";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.role) role = profile.role;
    } catch {
      // giữ mặc định là user
    }

    message.success("Đăng nhập thành công!");
    // Ưu tiên quay lại nơi user đang muốn vào (VD: chủ đề vừa bấm)
    if (redirectTo) router.replace(redirectTo);
    else if (role === "admin") router.replace("/admin/categories");
    else router.replace("/home");
  };

  const handleRegister = async () => {
    // Đăng ký chỉ bằng SĐT: tài khoản admin do người quản trị tạo sẵn
    const id = identifier.trim();
    if (!id) {
      message.error("Vui lòng nhập số điện thoại để đăng ký");
      return;
    }
    if (!isValidPhone(id)) {
      message.error("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }
    setLoading(true);
    const { data, error } = await registerWithPhone(id);
    if (error) {
      message.error(
        error.message.includes("already registered")
          ? "Số điện thoại này đã được đăng ký"
          : error.message
      );
      setLoading(false);
      return;
    }
    if (data.user) {
      message.success(
        `Đăng ký thành công! Mật khẩu mặc định là ${DEFAULT_PASSWORD}`,
        5
      );
      setPassword(DEFAULT_PASSWORD);
      setLoading(false);
    }
  };

  return (
    <div className="dotted-bg flex min-h-dvh flex-col items-center justify-center bg-cloud px-4 py-8">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.push("/home")}
          className="mb-4 inline-flex items-center gap-1.5 font-display font-extrabold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Quay lại
        </button>

        <Card className="p-6">
          <div className="text-center">
            <span className="anim-float block text-6xl" aria-hidden>
              🦉
            </span>
            <h1 className="mt-2 text-3xl text-ink">Chào bạn nhỏ!</h1>
            <p className="mt-1 font-bold text-ink-soft">
              Đăng nhập để bắt đầu học
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="sr-only">Số điện thoại hoặc email</span>
              <div className="flex items-center gap-3 rounded-pill border-2 border-cloud-deep bg-cloud px-4 focus-within:border-grape">
                <User size={20} className="shrink-0 text-ink-faint" />
                {/* Không khoá bàn phím số: ô này còn nhận email của quản trị viên */}
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Số điện thoại hoặc email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-transparent py-3.5 font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">Mật khẩu</span>
              <div className="flex items-center gap-3 rounded-pill border-2 border-cloud-deep bg-cloud px-4 focus-within:border-grape">
                <Lock size={20} className="shrink-0 text-ink-faint" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-transparent py-3.5 font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
                />
              </div>
            </label>

            <Button
              block
              loading={loading}
              icon={<LogIn size={20} strokeWidth={2.5} />}
              onClick={handleLogin}
            >
              Vào học
            </Button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-0.5 flex-1 rounded-full bg-cloud-deep" />
              <span className="text-sm font-bold text-ink-faint">hoặc</span>
              <span className="h-0.5 flex-1 rounded-full bg-cloud-deep" />
            </div>

            <Button
              block
              tone="plain"
              loading={loading}
              icon={<UserPlus size={20} strokeWidth={2.5} />}
              onClick={handleRegister}
            >
              Tạo tài khoản mới
            </Button>

            <p className="pt-1 text-center text-sm text-ink-soft">
              Tài khoản mới đăng ký bằng số điện thoại, mật khẩu mặc định là{" "}
              <strong className="text-ink">{DEFAULT_PASSWORD}</strong>. Bạn đổi
              được trong phần Cài đặt.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginContent />
    </Suspense>
  );
}
