-- Migration: hỗ trợ nhiều ngôn ngữ (tiếng Anh, tiếng Trung)
--
-- Ngôn ngữ đặt ở CATEGORY chứ không phải topic, vì logic chọn đáp án nhiễu
-- gom theo category — để ở topic thì một câu hỏi tiếng Anh có thể nhận đáp án
-- nhiễu tiếng Trung, trẻ đoán đúng ngay mà không cần biết nghĩa.
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent).
-- Chạy toàn bộ file này trong Supabase SQL Editor.

-- ========================================================
-- BƯỚC 1: Cột ngôn ngữ cho categories
--   Dữ liệu cũ toàn tiếng Anh nên default 'en' là đúng ngay, không cần backfill.
-- ========================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_language_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_language_check
      CHECK (language IN ('en', 'zh'));
    RAISE NOTICE 'Bước 1: đã thêm ràng buộc ngôn ngữ';
  ELSE
    RAISE NOTICE 'Bước 1: bỏ qua — ràng buộc đã tồn tại';
  END IF;
END $$;

-- ========================================================
-- BƯỚC 2: Bịt lỗ topic không thuộc category nào
--   Topic không có category thì không suy ra được ngôn ngữ. Form admin vốn đã
--   bắt chọn category — bước này làm chặt ở tầng database cho khớp.
-- ========================================================

-- 2a. Gom các topic mồ côi vào một category tạm để không mất dữ liệu
DO $$
DECLARE
  orphan_count INT;
  fallback_id UUID;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.topics WHERE category_id IS NULL;

  IF orphan_count = 0 THEN
    RAISE NOTICE 'Bước 2a: bỏ qua — không có topic mồ côi';
  ELSE
    SELECT id INTO fallback_id
    FROM public.categories WHERE name = 'Chưa phân loại' LIMIT 1;

    IF fallback_id IS NULL THEN
      INSERT INTO public.categories (name, description, language)
      VALUES (
        'Chưa phân loại',
        'Chủ đề chưa gán nhóm — hãy chuyển sang nhóm phù hợp',
        'en'
      )
      RETURNING id INTO fallback_id;
    END IF;

    UPDATE public.topics
    SET category_id = fallback_id
    WHERE category_id IS NULL;

    RAISE NOTICE 'Bước 2a: đã gom % topic mồ côi vào "Chưa phân loại"', orphan_count;
  END IF;
END $$;

-- 2b. Từ nay topic bắt buộc thuộc một category
ALTER TABLE public.topics ALTER COLUMN category_id SET NOT NULL;

-- 2c. Xoá category đang có topic thì phải chặn, không được bỏ topic ra mồ côi
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.topics'::regclass
    AND contype = 'f'
    AND confrelid = 'public.categories'::regclass;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.topics DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.topics
    ADD CONSTRAINT topics_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id)
    ON DELETE RESTRICT;

  RAISE NOTICE 'Bước 2c: xoá category có topic sẽ bị chặn';
END $$;

-- ========================================================
-- BƯỚC 3: Chỉ mục cho truy vấn lọc theo ngôn ngữ
--   Hàm chọn đáp án nhiễu lọc topic theo category + mode ở mỗi câu hỏi.
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_categories_language
  ON public.categories (language);

CREATE INDEX IF NOT EXISTS idx_topics_category_mode
  ON public.topics (category_id, mode);

-- ========================================================
-- KIỂM TRA KẾT QUẢ
-- ========================================================
SELECT c.language, c.name AS category, COUNT(t.id) AS so_chu_de
FROM public.categories c
LEFT JOIN public.topics t ON t.category_id = c.id
GROUP BY c.language, c.name
ORDER BY c.language, c.name;
