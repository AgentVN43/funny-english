-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (nhóm cấp cao: "Tiếng anh tiểu học", "Tiếng anh giao tiếp"...)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topics (chủ đề: "40 câu thông dụng lớp 1"... thuộc 1 category)
--   mode = 'word'     → từ vựng có hình, hỏi "tên tiếng Anh của … là gì"
--   mode = 'sentence' → mẫu câu giao tiếp, hiện câu tiếng Việt chọn câu tiếng Anh
--   question_prompt   → câu hỏi đọc lên, {tu} thay bằng nghĩa tiếng Việt của thẻ;
--                       để trống thì dùng mẫu mặc định theo mode
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'word' CHECK (mode IN ('word', 'sentence')),
  question_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards (thẻ học, thuộc 1 topic)
--   Chủ đề 'word'     → word là từ tiếng Anh, meaning_vi là nghĩa, image có ảnh
--   Chủ đề 'sentence' → word là câu tiếng Anh, meaning_vi là câu tiếng Việt
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning_vi TEXT NOT NULL,
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  cards_per_session INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  streak INT DEFAULT 0,
  status TEXT DEFAULT 'learning' CHECK (status IN ('learning', 'mastered')),
  last_reviewed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  INSERT INTO public.user_settings (user_id, cards_per_session)
  VALUES (NEW.id, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========== HELPER FUNCTION ==========

-- Bypasses RLS to check admin role, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- ========== RLS POLICIES ==========

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (public.is_admin());

-- Topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics"
  ON topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert topics"
  ON topics FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update topics"
  ON topics FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete topics"
  ON topics FOR DELETE
  USING (public.is_admin());

-- Cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cards"
  ON cards FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert cards"
  ON cards FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cards"
  ON cards FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete cards"
  ON cards FOR DELETE
  USING (public.is_admin());

-- User settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all settings"
  ON user_settings FOR SELECT
  USING (public.is_admin());

-- Progress
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON progress FOR SELECT
  USING (public.is_admin());
