"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserSettings, updateUserSettings } from "@/lib/db";
import { changePassword } from "@/lib/auth";
import { Button, Card, Input, InputNumber, Typography, message, Spin } from "antd";
import { Settings, Save, Lock, KeyRound } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardsPerSession, setCardsPerSession] = useState(10);
  const [userId, setUserId] = useState<string | null>(null);

  // Đổi mật khẩu
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadSettings(uid: string) {
    try {
      const settings = await getUserSettings(uid);
      setCardsPerSession(settings.cards_per_session);
    } catch {
      setCardsPerSession(10);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login?redirect=%2Fsettings");
        return;
      }
      setUserId(session.user.id);
      loadSettings(session.user.id);
    });
  }, [router]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <PageContainer className="py-4">
      <div className="mb-6">
        <Title level={4}>Cài đặt</Title>
        <Text type="secondary">Tùy chỉnh trải nghiệm học tập</Text>
      </div>

      <div className="space-y-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Settings size={24} className="text-indigo-600" />
            <div>
              <Text strong className="text-base">
                Số lượng thẻ mỗi phiên
              </Text>
              <Text type="secondary" className="block text-sm">
                Chọn số từ vựng bạn muốn học trong mỗi phiên
              </Text>
            </div>
          </div>
          <InputNumber
            min={5}
            max={50}
            value={cardsPerSession}
            onChange={(v) => setCardsPerSession(v || 10)}
            size="large"
            className="w-full rounded-xl"
          />
          <Button
            type="primary"
            size="large"
            block
            icon={<Save size={18} />}
            loading={saving}
            onClick={handleSave}
            className="mt-4 h-12 rounded-xl font-semibold"
          >
            Lưu cài đặt
          </Button>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <KeyRound size={24} className="text-indigo-600" />
            <div>
              <Text strong className="text-base">
                Đổi mật khẩu
              </Text>
              <Text type="secondary" className="block text-sm">
                Mật khẩu mới phải có ít nhất 8 ký tự
              </Text>
            </div>
          </div>
          <div className="space-y-3">
            <Input.Password
              size="large"
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
            />
            <Input.Password
              size="large"
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onPressEnter={handleChangePassword}
              className="rounded-xl"
            />
            <Button
              type="primary"
              size="large"
              block
              icon={<KeyRound size={18} />}
              loading={changingPassword}
              onClick={handleChangePassword}
              className="h-12 rounded-xl font-semibold"
            >
              Đổi mật khẩu
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
