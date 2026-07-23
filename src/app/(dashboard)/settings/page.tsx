"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserSettings, updateUserSettings } from "@/lib/db";
import { Button, Card, InputNumber, Typography, message, Spin } from "antd";
import { Settings, Save } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardsPerSession, setCardsPerSession] = useState(10);
  const [userId, setUserId] = useState<string | null>(null);

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
        router.replace("/");
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
    </PageContainer>
  );
}
