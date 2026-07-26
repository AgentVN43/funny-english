-- Migration: categories -> topics, thêm bảng categories cấp cao hơn
-- Cấu trúc mới: Category (nhóm lớn) -> Topic (chủ đề) -> Card (thẻ từ)
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent): mỗi bước tự kiểm tra trước khi làm,
-- bước nào đã xong sẽ được bỏ qua kèm thông báo NOTICE.
-- Chạy toàn bộ file này trong Supabase SQL Editor.

-- ========================================================
-- BƯỚC 1: Rename bảng categories cũ -> topics
-- ========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'topics'
  ) THEN
    RAISE NOTICE 'Bước 1: bỏ qua — bảng topics đã tồn tại';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    ALTER TABLE public.categories RENAME TO topics;
    RAISE NOTICE 'Bước 1: đã rename categories -> topics';
  ELSE
    RAISE EXCEPTION 'Không tìm thấy bảng categories lẫn topics — kiểm tra lại DB';
  END IF;
END $$;

-- ========================================================
-- BƯỚC 2: Rename cột cards.category_id -> topic_id
-- ========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'topic_id'
  ) THEN
    RAISE NOTICE 'Bước 2: bỏ qua — cards.topic_id đã tồn tại';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.cards RENAME COLUMN category_id TO topic_id;
    RAISE NOTICE 'Bước 2: đã rename cards.category_id -> topic_id';
  ELSE
    RAISE EXCEPTION 'Bảng cards không có cột category_id lẫn topic_id';
  END IF;
END $$;

-- ========================================================
-- BƯỚC 3: Tạo bảng categories mới (nhóm cấp cao)
--   VD: "Tiếng anh tiểu học", "Tiếng anh giao tiếp"
-- ========================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cảnh báo nếu categories vẫn là bảng cũ (còn cột image nghĩa là chưa rename đúng)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'image'
  ) THEN
    RAISE EXCEPTION 'Bảng categories còn cột "image" — đây là bảng CŨ, không phải bảng nhóm mới. Dừng lại và kiểm tra thủ công.';
  END IF;
END $$;

-- Trigger updated_at cho categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- BƯỚC 4: Topic thuộc về 1 category
-- ========================================================
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- ========================================================
-- BƯỚC 5: RLS cho bảng categories mới
-- ========================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- ========================================================
-- BƯỚC 6: Dọn tên cũ còn chữ "categories" trên bảng topics
--   Thuần thẩm mỹ, không ảnh hưởng dữ liệu. Tự bỏ qua nếu tên không khớp.
-- ========================================================
DO $$
BEGIN
  -- Foreign key trên cards
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cards_category_id_fkey'
      AND conrelid = 'public.cards'::regclass
  ) THEN
    ALTER TABLE public.cards
      RENAME CONSTRAINT cards_category_id_fkey TO cards_topic_id_fkey;
    RAISE NOTICE 'Bước 6: đã rename FK cards_category_id_fkey -> cards_topic_id_fkey';
  END IF;

  -- Primary key trên topics
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_pkey'
      AND conrelid = 'public.topics'::regclass
  ) THEN
    ALTER TABLE public.topics RENAME CONSTRAINT categories_pkey TO topics_pkey;
    RAISE NOTICE 'Bước 6: đã rename PK categories_pkey -> topics_pkey';
  END IF;

  -- Trigger updated_at trên topics
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_categories_updated_at'
      AND tgrelid = 'public.topics'::regclass
  ) THEN
    ALTER TRIGGER update_categories_updated_at ON public.topics
      RENAME TO update_topics_updated_at;
    RAISE NOTICE 'Bước 6: đã rename trigger trên topics';
  END IF;
END $$;

-- Policy trên topics: tạo lại với tên mới (an toàn nếu tên cũ đã mất)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.topics;
DROP POLICY IF EXISTS "Anyone can view topics" ON public.topics;
CREATE POLICY "Anyone can view topics"
  ON public.topics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.topics;
DROP POLICY IF EXISTS "Admins can insert topics" ON public.topics;
CREATE POLICY "Admins can insert topics"
  ON public.topics FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.topics;
DROP POLICY IF EXISTS "Admins can update topics" ON public.topics;
CREATE POLICY "Admins can update topics"
  ON public.topics FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.topics;
DROP POLICY IF EXISTS "Admins can delete topics" ON public.topics;
CREATE POLICY "Admins can delete topics"
  ON public.topics FOR DELETE
  USING (public.is_admin());

-- ========================================================
-- KIỂM TRA KẾT QUẢ
-- ========================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('categories', 'topics', 'cards')
ORDER BY table_name, ordinal_position;
