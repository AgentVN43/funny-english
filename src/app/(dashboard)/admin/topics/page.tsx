"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCategories,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
} from "@/lib/db";
import type { Category, Topic } from "@/lib/types";
import {
  Button,
  Card,
  Typography,
  Drawer,
  Input,
  Select,
  message,
  Spin,
  Popconfirm,
  Empty,
} from "antd";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

export default function AdminTopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function loadTopics(catId?: string) {
    try {
      const data = await getTopics(catId || undefined);
      setTopics(data);
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
      try {
        const cats = await getCategories();
        setCategories(cats);
        await loadTopics();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFilterChange = (v: string) => {
    setFilterCat(v || "");
    loadTopics(v || undefined);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setCategoryId(filterCat);
    setDrawerOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditing(topic);
    setName(topic.name);
    setDescription(topic.description);
    setCategoryId(topic.category_id || "");
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.error("Vui lòng nhập tên chủ đề");
      return;
    }
    if (!categoryId) {
      message.error("Vui lòng chọn categories");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTopic(editing.id, {
          name: name.trim(),
          description: description.trim(),
          category_id: categoryId,
        });
        message.success("Đã cập nhật chủ đề");
      } else {
        await createTopic(name.trim(), description.trim(), categoryId);
        message.success("Đã tạo chủ đề mới");
      }
      setDrawerOpen(false);
      loadTopics(filterCat || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTopic(id);
      message.success("Đã xóa chủ đề");
      loadTopics(filterCat || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    }
  };

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || "Chưa phân loại";

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
          <Title level={4} className="mb-1">Quản lý Chủ đề</Title>
          <Text type="secondary">Chủ đề thuộc từng categories</Text>
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
          onChange={handleFilterChange}
          placeholder="Lọc theo categories"
          allowClear
          size="large"
          className="w-full rounded-xl"
          options={[
            { value: "", label: "Tất cả categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {topics.length === 0 ? (
        <Empty description="Chưa có chủ đề nào" />
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <Card key={topic.id} className="rounded-2xl border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Layers size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <Text strong className="text-base block">{topic.name}</Text>
                    <Text type="secondary" className="text-sm block">
                      {categoryName(topic.category_id)}
                    </Text>
                    {topic.description && (
                      <Text type="secondary" className="text-xs">{topic.description}</Text>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="text"
                    icon={<Edit2 size={16} />}
                    onClick={() => openEdit(topic)}
                    className="min-w-[44px] min-h-[44px]"
                  />
                  <Popconfirm
                    title="Xóa chủ đề này?"
                    description="Các thẻ từ vựng trong chủ đề cũng sẽ bị xóa"
                    onConfirm={() => handleDelete(topic.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button type="text" danger icon={<Trash2 size={16} />} className="min-w-[44px] min-h-[44px]" />
                  </Popconfirm>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        title={editing ? "Sửa chủ đề" : "Thêm chủ đề mới"}
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
            <Text className="block mb-1 font-medium">Categories</Text>
            <Select
              value={categoryId || undefined}
              onChange={(v) => setCategoryId(v)}
              placeholder="Chọn categories"
              size="large"
              className="w-full rounded-xl"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Tên chủ đề</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: 40 câu thông dụng lớp 1..."
              size="large"
              className="rounded-xl"
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Mô tả (không bắt buộc)</Text>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về chủ đề"
              size="large"
              className="rounded-xl"
            />
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
}
