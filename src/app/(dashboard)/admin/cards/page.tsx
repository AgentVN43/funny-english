"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCards,
  createCard,
  createCards,
  updateCard,
  deleteCard,
  getTopics,
} from "@/lib/db";
import {
  parseImportText,
  importPlaceholder,
  importHint,
} from "@/lib/import-cards";
import type { Card, Topic, TopicMode } from "@/lib/types";
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
import { Plus, Edit2, Trash2, Upload, AlertCircle } from "lucide-react";
import { Screen } from "@/components/ui/Layout";

const { Title, Text } = Typography;

function AdminCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [word, setWord] = useState("");
  const [meaningVi, setMeaningVi] = useState("");
  const [image, setImage] = useState("");
  const [topicId, setTopicId] = useState(searchParams.get("topic_id") || "");
  const [filterTopic, setFilterTopic] = useState(searchParams.get("topic_id") || "");
  const [saving, setSaving] = useState(false);

  // Nhập từ hàng loạt
  const [importOpen, setImportOpen] = useState(false);
  const [importTopicId, setImportTopicId] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Chủ đề mẫu câu chứa cả câu chứ không phải từ đơn: ô nhập phải rộng ra,
  // nhãn phải đổi, và ảnh thì không dùng đến
  const isSentence =
    topics.find((t) => t.id === topicId)?.mode === "sentence";

  // Kiểu của chủ đề đang nhập quyết định định dạng mỗi dòng
  const importMode: TopicMode =
    topics.find((t) => t.id === importTopicId)?.mode ?? "word";
  const parsed = parseImportText(importText, importMode);

  async function loadCards(tId?: string) {
    try {
      const data = await getCards(tId || undefined);
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
      try {
        const tps = await getTopics();
        setTopics(tps);
        await loadCards(filterTopic || undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFilterChange = (v: string) => {
    setFilterTopic(v || "");
    loadCards(v || undefined);
  };

  const openCreate = () => {
    setEditing(null);
    setWord("");
    setMeaningVi("");
    setImage("");
    setTopicId(filterTopic);
    setDrawerOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setWord(card.word);
    setMeaningVi(card.meaning_vi);
    setImage(card.image);
    setTopicId(card.topic_id);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!word.trim() || !meaningVi.trim() || !topicId) {
      message.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    // Đổi chủ đề sang kiểu mẫu câu thì bỏ luôn ảnh cũ, đừng để lại rác ẩn
    const imageValue = isSentence ? "" : image.trim();
    try {
      if (editing) {
        await updateCard(editing.id, {
          word: word.trim(),
          meaning_vi: meaningVi.trim(),
          image: imageValue,
          topic_id: topicId,
        });
        message.success("Đã cập nhật thẻ");
      } else {
        await createCard(topicId, word.trim(), meaningVi.trim(), imageValue);
        message.success("Đã tạo thẻ mới");
      }
      setDrawerOpen(false);
      loadCards(filterTopic || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi: " + msg);
    } finally {
      setSaving(false);
    }
  };

  /** Đang lọc theo chủ đề nào thì nhập thẳng vào chủ đề đó */
  const openImport = () => {
    setImportTopicId(filterTopic);
    setImportText("");
    setImportOpen(true);
  };

  const handleImport = async () => {
    if (!importTopicId) {
      message.error("Vui lòng chọn chủ đề để nhập từ");
      return;
    }
    if (parsed.valid.length === 0) {
      message.error("Chưa có dòng nào hợp lệ để nhập");
      return;
    }
    setImporting(true);
    try {
      await createCards(
        parsed.valid.map((r) => ({
          topic_id: importTopicId,
          word: r.word,
          meaning_vi: r.meaning_vi,
          // Chủ đề mẫu câu không dùng ảnh
          image: importMode === "sentence" ? "" : r.image,
        }))
      );
      message.success(`Đã nhập ${parsed.valid.length} thẻ`);
      setImportOpen(false);
      setImportText("");
      // Nhập vào chủ đề khác bộ lọc hiện tại thì chuyển bộ lọc sang đó để thấy kết quả
      if (filterTopic && filterTopic !== importTopicId) {
        setFilterTopic(importTopicId);
      }
      loadCards(
        filterTopic && filterTopic !== importTopicId
          ? importTopicId
          : filterTopic || undefined
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      message.error("Lỗi nhập từ: " + msg);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      message.success("Đã xóa thẻ");
      loadCards(filterTopic || undefined);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={4} className="mb-1">Quản lý Thẻ từ</Title>
          <Text type="secondary">Thêm, sửa, xóa thẻ từ vựng</Text>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            icon={<Upload size={18} />}
            onClick={openImport}
            className="rounded-xl min-h-[44px]"
          >
            Nhập từ
          </Button>
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={openCreate}
            className="rounded-xl min-h-[44px]"
          >
            Thêm
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Select
          value={filterTopic}
          onChange={handleFilterChange}
          placeholder="Lọc theo chủ đề"
          allowClear
          size="large"
          className="w-full rounded-xl"
          options={[
            { value: "", label: "Tất cả chủ đề" },
            ...topics.map((t) => ({ value: t.id, label: t.name })),
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
                    {topics.find((t) => t.id === card.topic_id)?.name || "Unknown"}
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
              value={topicId || undefined}
              onChange={(v) => setTopicId(v)}
              placeholder="Chọn chủ đề"
              size="large"
              className="w-full rounded-xl"
              options={topics.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div>
            <Text className="block mb-1 font-medium">
              {isSentence ? "Câu tiếng Anh/Trung" : "Từ vựng (English/Chinese)"}
            </Text>
            {isSentence ? (
              <Input.TextArea
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="VD: Could you show me the way to the station?"
                autoSize={{ minRows: 2, maxRows: 4 }}
                size="large"
                className="rounded-xl"
              />
            ) : (
              <Input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="VD: apple"
                size="large"
                className="rounded-xl"
              />
            )}
          </div>
          <div>
            <Text className="block mb-1 font-medium">
              {isSentence ? "Câu tiếng Việt" : "Nghĩa (Tiếng Việt)"}
            </Text>
            {isSentence ? (
              <Input.TextArea
                value={meaningVi}
                onChange={(e) => setMeaningVi(e.target.value)}
                placeholder="VD: Bạn chỉ giúp tôi đường tới nhà ga được không?"
                autoSize={{ minRows: 2, maxRows: 4 }}
                size="large"
                className="rounded-xl"
              />
            ) : (
              <Input
                value={meaningVi}
                onChange={(e) => setMeaningVi(e.target.value)}
                placeholder="VD: quả táo"
                size="large"
                className="rounded-xl"
              />
            )}
          </div>
          {/* Bài mẫu câu không hiện ảnh nên không hỏi ảnh */}
          {!isSentence && (
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
          )}
        </div>
      </Drawer>

      {/* Nhập từ hàng loạt */}
      <Drawer
        title="Nhập từ hàng loạt"
        placement="bottom"
        onClose={() => setImportOpen(false)}
        open={importOpen}
        rootClassName="bottom-sheet"
        styles={{ wrapper: { height: "auto" } }}
        extra={
          <Button
            type="primary"
            loading={importing}
            disabled={!importTopicId || parsed.valid.length === 0}
            onClick={handleImport}
            className="rounded-xl"
          >
            Nhập {parsed.valid.length > 0 ? `${parsed.valid.length} thẻ` : ""}
          </Button>
        }
      >
        <div className="drawer-handle" />
        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <Text className="block mb-1 font-medium">Chủ đề</Text>
            <Select
              value={importTopicId || undefined}
              onChange={(v) => setImportTopicId(v)}
              placeholder="Chọn chủ đề để nhập vào"
              size="large"
              showSearch
              optionFilterProp="label"
              className="w-full rounded-xl"
              options={topics.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </div>

          {importTopicId && (
            <>
              <div>
                <Text className="block mb-1 font-medium">Danh sách</Text>
                <Text type="secondary" className="block mb-2 text-sm">
                  {importHint(importMode)}
                </Text>
                <Input.TextArea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={importPlaceholder(importMode)}
                  autoSize={{ minRows: 6, maxRows: 14 }}
                  className="rounded-xl font-mono text-sm"
                />
              </div>

              {parsed.rows.length > 0 && (
                <div className="rounded-xl bg-gray-50 p-3 space-y-2">
                  <Text className="block text-sm">
                    <span className="font-medium text-green-600">
                      {parsed.valid.length} dòng hợp lệ
                    </span>
                    {parsed.invalid.length > 0 && (
                      <span className="text-red-500">
                        {" · "}
                        {parsed.invalid.length} dòng lỗi
                      </span>
                    )}
                  </Text>

                  {parsed.invalid.length > 0 && (
                    <div className="space-y-1">
                      {parsed.invalid.slice(0, 5).map((r) => (
                        <div
                          key={r.line}
                          className="flex items-start gap-2 text-xs text-red-600"
                        >
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>
                            Dòng {r.line}: {r.error} — &ldquo;{r.raw}&rdquo;
                          </span>
                        </div>
                      ))}
                      {parsed.invalid.length > 5 && (
                        <Text type="secondary" className="text-xs">
                          ...và {parsed.invalid.length - 5} dòng lỗi khác
                        </Text>
                      )}
                    </div>
                  )}

                  {parsed.valid.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <Text type="secondary" className="text-xs">
                        Xem trước:
                      </Text>
                      {parsed.valid.slice(0, 3).map((r) => (
                        <div key={r.line} className="text-xs text-gray-700">
                          <span className="font-medium">{r.word}</span>
                          {" → "}
                          {r.meaning_vi}
                          {r.image && importMode === "word" && (
                            <span className="text-gray-400"> · có ảnh</span>
                          )}
                        </div>
                      ))}
                      {parsed.valid.length > 3 && (
                        <Text type="secondary" className="text-xs">
                          ...và {parsed.valid.length - 3} dòng nữa
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>
    </Screen>
  );
}

export default function AdminCardsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spin size="large" /></div>}>
      <AdminCardsContent />
    </Suspense>
  );
}
