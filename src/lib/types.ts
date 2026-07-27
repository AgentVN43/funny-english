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

/** Chủ đề: "40 câu thông dụng lớp 1"... thuộc 1 category */
export interface Topic {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  image: string;
  created_at: string;
  updated_at: string;
}

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
