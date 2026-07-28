export interface Profile {
  id: string;
  email: string;
  role: "admin" | "user";
  display_name?: string;
  created_at: string;
  updated_at: string;
}

/** Nhóm cấp cao: "Tiếng anh tiểu học", "Tiếng anh giao tiếp"... */
export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/**
 * Kiểu bài của một chủ đề.
 *
 * `word` — từ vựng có hình: hiện ảnh + nghĩa tiếng Việt, chọn từ tiếng Anh.
 * `sentence` — mẫu câu giao tiếp: hiện câu tiếng Việt, chọn câu tiếng Anh.
 *   Câu giao tiếp không hỏi được kiểu "tên tiếng Anh của … là gì" nên cần bố
 *   cục và câu hỏi riêng.
 */
export type TopicMode = "word" | "sentence";

/** Chủ đề: "40 câu thông dụng lớp 1"... thuộc 1 category */
export interface Topic {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  image: string;
  mode: TopicMode;
  /** Câu hỏi đọc lên, {tu} thay bằng nghĩa tiếng Việt. Trống = mẫu mặc định */
  question_prompt: string;
  created_at: string;
  updated_at: string;
}

/**
 * Một thẻ học. Chủ đề `sentence` dùng chung bảng này: `word` chứa câu tiếng
 * Anh, `meaning_vi` chứa câu tiếng Việt, `image` bỏ trống.
 */
export interface Card {
  id: string;
  topic_id: string;
  word: string;
  meaning_vi: string;
  image: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  cards_per_session: number;
  created_at: string;
  updated_at: string;
}

/** Một lượt học một chủ đề — dùng cho màn hình lịch sử theo ngày/giờ */
export interface StudySession {
  id: string;
  user_id: string;
  topic_id: string | null;
  /** Tên chủ đề chụp tại lúc học, để xoá/đổi tên sau không hỏng lịch sử */
  topic_name: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  /** Lúc trả lời câu đầu tiên */
  started_at: string;
  /** Lúc trả lời câu gần nhất */
  ended_at: string;
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  card_id: string;
  correct_count: number;
  wrong_count: number;
  streak: number;
  status: "learning" | "mastered";
  last_reviewed: string;
  created_at: string;
}
