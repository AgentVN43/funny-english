"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Card, Typography, Spin, Divider } from "antd";
import { BookOpen, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/home");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-dvh bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <Card className="w-full max-w-sm text-center shadow-2xl rounded-2xl mx-auto">
        <div className="py-8">
          <div className="flex justify-center mb-4">
            <BookOpen size={48} className="text-indigo-500" />
          </div>
          <Title level={2} className="mb-1">
            Funny Learn English
          </Title>
          <Text type="secondary">Học tiếng Anh qua flashcards</Text>
          <Divider />
          <div className="w-full">
            <Button
              type="primary"
              size="large"
              block
              icon={<LogIn size={18} />}
              onClick={() => router.push("/login")}
              className="h-12 rounded-xl text-base font-semibold"
            >
              Đăng nhập
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
