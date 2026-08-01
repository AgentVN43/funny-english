"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/db";
import { DEFAULT_LANGUAGE } from "@/lib/types";
import type { Category, Language } from "@/lib/types";
import { LANGUAGE_NAME } from "@/lib/question";
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
import { Plus, Edit2, Trash2, FolderTree } from "lucide-react";
import { Screen } from "@/components/ui/Layout";

const { Title, Text } = Typography;

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: LANGUAGE_NAME.en },
  { value: "zh", label: LANGUAGE_NAME.zh },
];

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
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
    setLanguage(DEFAULT_LANGUAGE);
    setDrawerOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setLanguage(cat.language ?? DEFAULT_LANGUAGE);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.error("Vui lòng nhập tên categories");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, {
          name: name.trim(),
          description: description.trim(),
          language,
        });
        message.success("Đã cập nhật categories");
      } else {
        await createCategory(name.trim(), description.trim(), language);
        message.success("Đã tạo categories mới");
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
      message.success("Đã xóa categories");
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
    <Screen className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} className="mb-1">Quản lý Categories</Title>
          <Text type="secondary">Nhóm lớn chứa các chủ đề học tập</Text>
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
        <Empty description="Chưa có categories nào" />
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="rounded-2xl border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <FolderTree size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <Text strong className="text-base block">{cat.name}</Text>
                    <Text type="secondary" className="text-sm block">
                      {LANGUAGE_NAME[cat.language ?? DEFAULT_LANGUAGE]}
                    </Text>
                    {cat.description && (
                      <Text type="secondary" className="text-xs">{cat.description}</Text>
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
                    title="Xóa categories này?"
                    description="Chỉ xóa được khi bên trong không còn chủ đề nào"
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
        title={editing ? "Sửa categories" : "Thêm categories mới"}
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
            <Text className="block mb-1 font-medium">Ngôn ngữ</Text>
            <Select
              value={language}
              onChange={(v: Language) => setLanguage(v)}
              size="large"
              className="w-full rounded-xl"
              options={LANGUAGE_OPTIONS}
            />
            <Text type="secondary" className="block mt-1 text-xs">
              Đáp án nhiễu chỉ lấy trong cùng ngôn ngữ, nên mỗi nhóm chỉ chứa
              một thứ tiếng.
              {editing && " Đổi ngôn ngữ sẽ đổi cho mọi chủ đề bên trong."}
            </Text>
          </div>
          <div>
            <Text className="block mb-1 font-medium">Tên categories</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tiếng Anh tiểu học, Tiếng Trung giao tiếp..."
              size="large"
              className="rounded-xl"
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">Mô tả (không bắt buộc)</Text>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn"
              size="large"
              className="rounded-xl"
            />
          </div>
        </div>
      </Drawer>
    </Screen>
  );
}
