"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCards, createCard, updateCard, deleteCard, getCategories } from "@/lib/db";
import type { Card, Category } from "@/lib/types";
import {
  Button,
  Card as AntCard,
  Typography,
  Drawer,
  Input,
  Select,
  message,
  Spin,
  Popconfirm,
  Empty,
} from "antd";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

function AdminCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [word, setWord] = useState("");
  const [meaningVi, setMeaningVi] = useState("");
  const [image, setImage] = useState("");
  const [categoryId, setCategoryId] = useState(searchParams.get("category_id") || "");
  const [filterCat, setFilterCat] = useState(searchParams.get("category_id") || "");
  const [saving, setSaving] = useState(false);

  async function loadCards() {
    try {
      const data = await getCards(filterCat || undefined);
      setCards(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi tải dữ liệu: " + msg);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?admin=true");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.role !== "admin") {
        message.error("Bạn không có quyền admin");
        router.replace("/home");
        return;
      }
      const cats = await getCategories();
      setCategories(cats);
      setLoading(false);
      loadCards();
    })();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    (async () => {
      try {
        const data = await getCards(filterCat || undefined);
        setCards(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        message.error("Lỗi tải dữ liệu: " + msg);
      }
    })();
  }, [filterCat, categories.length]);

  const openCreate = () => {
    setEditing(null);
    setWord("");
    setMeaningVi("");
    setImage("");
    setCategoryId(filterCat);
    setDrawerOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setWord(card.word);
    setMeaningVi(card.meaning_vi);
    setImage(card.image);
    setCategoryId(card.category_id);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!word.trim() || !meaningVi.trim() || !categoryId) {
      message.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCard(editing.id, {
          word: word.trim(),
          meaning_vi: meaningVi.trim(),
          image: image.trim(),
          category_id: categoryId,
        });
        message.success("Đã cập nhật thẻ");
      } else {
        await createCard(categoryId, word.trim(), meaningVi.trim(), image.trim());
        message.success("Đã tạo thẻ mới");
      }
      setDrawerOpen(false);
      loadCards();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      message.success("Đã xóa thẻ");
      loadCards();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={4} className="mb-1">Quản lý Thẻ từ</Title>
          <Text type="secondary">Thêm, sửa, xóa thẻ từ vựng</Text>
        </div>
        <Button
          type="primary"
          icon={<Plus size={18} />}
          onClick={openCreate}
          className="rounded-xl min-h-[44px]"
        >
          Thêm
        </Button>
      </div>

      <div className="mb-4">
        <Select
          value={filterCat}
          onChange={(v) => setFilterCat(v || "")}
          placeholder="Lọc theo chủ đề"
          allowClear
          size="large"
          className="w-full rounded-xl"
          options={[
            { value: "", label: "Tất cả chủ đề" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {cards.length === 0 ? (
        <Empty description="Chưa có thẻ từ nào" />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <AntCard key={card.id} className="rounded-2xl border-0 shadow-sm">
              <div className="flex items-center gap-3">
                {card.image && (
                  <img
                    src={card.image}
                    alt={card.word}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Text strong className="text-base block">{card.word}</Text>
                  <Text type="secondary" className="text-sm block truncate">
                    {card.meaning_vi}
                  </Text>
                  <Text type="secondary" className="text-xs">
                    {categories.find((c) => c.id === card.category_id)?.name || "Unknown"}
                  </Text>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="text"
                    icon={<Edit2 size={16} />}
                    onClick={() => openEdit(card)}
                    className="min-w-[44px] min-h-[44px]"
                  />
                  <Popconfirm
                    title="Xóa thẻ này?"
                    onConfirm={() => handleDelete(card.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button type="text" danger icon={<Trash2 size={16} />} className="min-w-[44px] min-h-[44px]" />
                  </Popconfirm>
                </div>
              </div>
            </AntCard>
          ))}
        </div>
      )}

      <Drawer
        title={editing ? "Sửa thẻ từ" : "Thêm thẻ từ mới"}
        placement="bottom"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        rootClassName="bottom-sheet"
        styles={{ wrapper: { height: "auto" } }}
        extra={
          <Button
            type="primary"
            loading={saving}
            onClick={handleSave}
            className="rounded-xl"
          >
            {editing ? "Lưu" : "Tạo"}
          </Button>
        }
      >
        <div className="drawer-handle" />
        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <Text className="block mb-1 font-medium">Chủ đề</Text>
            <Select
              value={categoryId}
              onChange={(v) => setCategoryId(v)}
              placeholder="Chọn chủ đề"
              size="large"
              className="w-full rounded-xl"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Từ vựng (English)</Text>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="VD: apple"
              size="large"
              className="rounded-xl"
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Nghĩa (Tiếng Việt)</Text>
            <Input
              value={meaningVi}
              onChange={(e) => setMeaningVi(e.target.value)}
              placeholder="VD: quả táo"
              size="large"
              className="rounded-xl"
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Hình ảnh URL (không bắt buộc)</Text>
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              size="large"
              className="rounded-xl"
            />
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
}

export default function AdminCardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spin size="large" /></div>}>
      <AdminCardsContent />
    </Suspense>
  );
}
