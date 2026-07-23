"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Input, Typography, message, Divider } from "antd";
import { BookOpen, Mail, Lock, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      message.error("Vui lòng nhập email và mật khẩu");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      message.error(error.message);
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
    if (role === "admin") {
      router.push("/admin/categories");
    } else {
      router.push("/home");
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      message.error("Vui lòng nhập email và mật khẩu");
      return;
    }
    if (password.length < 6) {
      message.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      message.error(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      message.success(
        "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <Card className="w-full max-w-sm shadow-2xl rounded-2xl">
        <div className="py-6">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => router.push("/")}
            className="mb-2"
          />
          <div className="flex justify-center mb-2">
            <BookOpen size={40} className="text-indigo-500" />
          </div>
          <Title level={3} className="text-center mb-1">
            Đăng nhập
          </Title>
          <Text type="secondary" className="block text-center mb-6">
            Tiếp tục học tập
          </Text>
          <div className="space-y-4">
            <Input
              size="large"
              prefix={<Mail size={18} className="text-gray-400" />}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
            />
            <Input.Password
              size="large"
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          </div>
        </div>
      </Card>
    </div>
  );
}
