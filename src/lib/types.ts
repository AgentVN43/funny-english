export interface Profile {
  id: string;
  email: string;
  role: "admin" | "user";
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  category_id: string;
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
