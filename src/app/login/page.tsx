"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  loginWithPhone,
  registerWithPhone,
  isValidPhone,
  DEFAULT_PASSWORD,
} from "@/lib/auth";
import { Button, Card, Input, Typography, message, Divider, Spin } from "antd";
import { BookOpen, Phone, Lock, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const { Title, Text } = Typography;

/** Chỉ cho phép đường dẫn nội bộ để tránh open redirect */
function safeRedirect(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const id = phone.trim();
    if (!id || !password) {
      message.error("Vui lòng nhập số điện thoại và mật khẩu");
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
          ? "Số điện thoại hoặc mật khẩu không đúng"
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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError) {
        console.error("Lỗi truy cập profiles: ", profileError);
      }
      if (profile && profile.role) {
        role = profile.role;
      }
    } catch (e) {
      console.error("Lỗi khi lấy thông tin profile: ", e);
    }

    message.success("Đăng nhập thành công!");
    // Ưu tiên quay lại nơi user đang muốn vào (VD: chủ đề vừa bấm)
    if (redirectTo) {
      router.replace(redirectTo);
    } else if (role === "admin") {
      router.replace("/admin/categories");
    } else {
      router.replace("/home");
    }
  };

  const handleRegister = async () => {
    const id = phone.trim();
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
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <Card className="w-full max-w-sm shadow-2xl rounded-2xl mx-auto">
        <div className="py-6">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => router.push("/home")}
            className="mb-2"
          />
          <div className="flex justify-center mb-2">
            <BookOpen size={40} className="text-indigo-500" />
          </div>
          <Title level={3} className="text-center mb-1">
            Đăng nhập
          </Title>
          <Text type="secondary" className="block text-center mb-6">
            Dùng số điện thoại để đăng nhập
          </Text>
          <div className="space-y-4">
            <Input
              size="large"
              type="tel"
              inputMode="numeric"
              prefix={<Phone size={18} className="text-gray-400" />}
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
            />
            <Input.Password
              size="large"
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleLogin}
              className="rounded-xl"
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleLogin}
              className="h-12 rounded-xl text-base font-semibold"
            >
              Đăng nhập
            </Button>
            <Divider>
              <Text type="secondary" className="text-xs">
                hoặc
              </Text>
            </Divider>
            <Button
              size="large"
              block
              loading={loading}
              onClick={handleRegister}
              className="h-12 rounded-xl"
            >
              Đăng ký tài khoản mới
            </Button>
            <Text
              type="secondary"
              className="block text-center text-xs"
            >
              Tài khoản mới có mật khẩu mặc định là {DEFAULT_PASSWORD}.
              <br />
              Bạn có thể đổi mật khẩu trong phần Cài đặt.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-indigo-500 to-purple-600">
          <Spin size="large" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
