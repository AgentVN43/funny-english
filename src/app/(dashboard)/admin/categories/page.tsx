"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/db";
import type { Category } from "@/lib/types";
import {
  Button,
  Card,
  Typography,
  Drawer,
  Input,
  message,
  Spin,
  Popconfirm,
  Empty,
} from "antd";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";
import { PageContainer } from "@/components/MainLayout";

const { Title, Text } = Typography;

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi tải dữ liệu: " + msg);
    } finally {
      setLoading(false);
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
      loadData();
    })();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDrawerOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.error("Vui lòng nhập tên chủ đề");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), description: description.trim() });
        message.success("Đã cập nhật chủ đề");
      } else {
        await createCategory(name.trim(), description.trim());
        message.success("Đã tạo chủ đề mới");
      }
      setDrawerOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success("Đã xóa chủ đề");
      loadData();
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} className="mb-1">Quản lý Chủ đề</Title>
          <Text type="secondary">Thêm, sửa, xóa chủ đề học tập</Text>
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

      {categories.length === 0 ? (
        <Empty description="Chưa có chủ đề nào" />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="rounded-2xl border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Layers size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <Text strong className="text-base block">{cat.name}</Text>
                    {cat.description && (
                      <Text type="secondary" className="text-sm">{cat.description}</Text>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="text"
                    icon={<Edit2 size={16} />}
                    onClick={() => openEdit(cat)}
                    className="min-w-[44px] min-h-[44px]"
                  />
                  <Popconfirm
                    title="Xóa chủ đề này?"
                    description="Các thẻ từ vựng trong chủ đề cũng sẽ bị xóa"
                    onConfirm={() => handleDelete(cat.id)}
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
            <Text className="block mb-1 font-medium">Tên chủ đề</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Động vật, Màu sắc..."
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
