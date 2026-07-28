import { supabase } from "./supabase";
import { DEFAULT_CARDS_PER_SESSION, MASTERY_STREAK } from "./constants";
import type { CardProgress } from "./session";
import type {
  Category,
  Profile,
  Topic,
  TopicMode,
  Card,
  Progress,
  StudySession,
  UserSettings,
} from "./types";

// Categories (nhóm cấp cao)
export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(name: string, description: string) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Topics (chủ đề)
export async function getTopics(categoryId?: string) {
  let query = supabase.from("topics").select("*");
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data as Topic[];
}

export async function getTopicById(id: string) {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Topic | null;
}

export async function createTopic(
  name: string,
  description: string,
  category_id: string | null,
  options: { mode?: TopicMode; question_prompt?: string } = {}
) {
  const { data, error } = await supabase
    .from("topics")
    .insert({
      name,
      description,
      category_id,
      mode: options.mode ?? "word",
      question_prompt: options.question_prompt ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Topic;
}

export async function updateTopic(id: string, updates: Partial<Topic>) {
  const { data, error } = await supabase
    .from("topics")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Topic;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

// Cards
export async function getCards(topicId?: string) {
  let query = supabase.from("cards").select("*");
  if (topicId) query = query.eq("topic_id", topicId);
  const { data, error } = await query.order("word");
  if (error) throw error;
  return data as Card[];
}

/**
 * Thẻ mượn từ chủ đề khác để bổ sung đáp án nhiễu khi chủ đề hiện tại có quá
 * ít thẻ để dựng đủ 4 lựa chọn.
 *
 * Ưu tiên chủ đề cùng nhóm cho sát chủ điểm. Nhưng chủ đề có thể chưa được
 * gán nhóm (`category_id` rỗng) hoặc nhóm không còn thẻ nào — khi đó vẫn phải
 * mượn từ chủ đề bất kỳ, vì thà nhiễu lệch chủ điểm còn hơn để lộ đáp án
 * đúng do chỉ hiện được 1-2 lựa chọn.
 */
export async function getExtraDistractorCards(topicId: string, limit = 60) {
  const { data: topic } = await supabase
    .from("topics")
    .select("category_id")
    .eq("id", topicId)
    .maybeSingle();

  if (topic?.category_id) {
    const { data: siblings } = await supabase
      .from("topics")
      .select("id")
      .eq("category_id", topic.category_id)
      .neq("id", topicId);
    const siblingIds = (siblings ?? []).map((t) => t.id);
    if (siblingIds.length > 0) {
      const { data } = await supabase
        .from("cards")
        .select("*")
        .in("topic_id", siblingIds)
        .limit(limit);
      if (data && data.length > 0) return data as Card[];
    }
  }

  const { data } = await supabase
    .from("cards")
    .select("*")
    .neq("topic_id", topicId)
    .limit(limit);
  return (data ?? []) as Card[];
}

export async function getCardById(id: string) {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Card;
}

export async function createCard(
  topic_id: string,
  word: string,
  meaning_vi: string,
  image: string
) {
  const { data, error } = await supabase
    .from("cards")
    .insert({ topic_id, word, meaning_vi, image })
    .select()
    .single();
  if (error) throw error;
  return data as Card;
}

export async function updateCard(id: string, updates: Partial<Card>) {
  const { data, error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Card;
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

// Progress
export async function getProgress(userId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select("*, cards(*, topics(id, name))")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

/** Tiến độ của user với riêng các thẻ thuộc một chủ đề */
export async function getTopicProgress(userId: string, topicId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select(
      "card_id, streak, correct_count, wrong_count, last_reviewed, cards!inner(topic_id)"
    )
    .eq("user_id", userId)
    .eq("cards.topic_id", topicId);
  if (error) throw error;
  return (data ?? []) as unknown as CardProgress[];
}

export async function upsertProgress(
  userId: string,
  cardId: string,
  isCorrect: boolean
) {
  const { data: existing } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .single();

  const correct_count = (existing?.correct_count || 0) + (isCorrect ? 1 : 0);
  const wrong_count = (existing?.wrong_count || 0) + (isCorrect ? 0 : 1);
  const streak = isCorrect ? (existing?.streak || 0) + 1 : 0;
  const status = streak >= MASTERY_STREAK ? "mastered" : "learning";

  const { data, error } = await supabase
    .from("progress")
    .upsert(
      {
        user_id: userId,
        card_id: cardId,
        correct_count,
        wrong_count,
        streak,
        status,
        last_reviewed: new Date().toISOString(),
      },
      { onConflict: "user_id, card_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Progress;
}

// Study sessions (lịch sử từng buổi học)

/**
 * Mở một buổi học. Gọi khi trả lời câu ĐẦU TIÊN chứ không phải lúc mở trang,
 * để người chỉ bấm vào xem rồi thoát không sinh dòng rác.
 */
export async function startStudySession(
  userId: string,
  topicId: string,
  topicName: string,
  isCorrect: boolean
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: userId,
      topic_id: topicId,
      topic_name: topicName,
      total_questions: 1,
      correct_count: isCorrect ? 1 : 0,
      wrong_count: isCorrect ? 0 : 1,
      started_at: now,
      ended_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Cập nhật sau mỗi câu trả lời. `ended_at` luôn là câu gần nhất, nên buổi học
 * bỏ dở giữa chừng vẫn có khoảng thời gian đúng.
 */
export async function updateStudySession(
  sessionId: string,
  totals: { total: number; correct: number; wrong: number }
) {
  const { error } = await supabase
    .from("study_sessions")
    .update({
      total_questions: totals.total,
      correct_count: totals.correct,
      wrong_count: totals.wrong,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getStudySessions(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StudySession[];
}

// User Settings

/**
 * Trả về cài đặt mặc định thay vì ném lỗi khi user chưa có dòng trong
 * `user_settings` (trigger tạo profile không chạy, hoặc tài khoản tạo từ
 * trước khi có trigger) — trước đây trường hợp này làm trang học treo mãi.
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as UserSettings;
  return {
    user_id: userId,
    cards_per_session: DEFAULT_CARDS_PER_SESSION,
    created_at: "",
    updated_at: "",
  };
}

export async function updateUserSettings(
  userId: string,
  cards_per_session: number
) {
  // upsert để tự tạo dòng nếu user chưa có cài đặt
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, cards_per_session }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as UserSettings;
}

// Profile
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

// Theo dõi học viên (chỉ admin — RLS chặn học viên thường đọc của người khác)

/**
 * Danh sách toàn bộ tài khoản. RLS chỉ trả về đủ danh sách khi người gọi là
 * admin; học viên thường sẽ chỉ thấy chính mình.
 */
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

/**
 * Buổi học của MỌI học viên, mới nhất trước.
 *
 * Lấy một lần rồi chia theo người ở phía client: rẻ hơn nhiều so với gọi
 * riêng cho từng học viên khi dựng bảng theo dõi. `limit` là chốt chặn để
 * trang không phình vô hạn khi dữ liệu lớn dần.
 */
export async function getAllStudySessions(limit = 2000) {
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StudySession[];
}
