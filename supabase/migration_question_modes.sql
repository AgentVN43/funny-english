-- Migration: hai kiểu bài học trên bảng topics
--
-- Chủ đề từ vựng (con vật, trái cây, đồ vật) hỏi được "tên tiếng Anh của … là
-- gì". Chủ đề giao tiếp (nhà hàng, hỏi đường) thì không — ở đó phải hiện câu
-- tiếng Việt rồi cho chọn câu tiếng Anh tương ứng. Hai kiểu dùng chung bảng
-- cards: câu tiếng Anh nằm ở `word`, câu tiếng Việt ở `meaning_vi`, `image`
-- bỏ trống.
--
--   mode = 'word'     → từ vựng có hình (mặc định, mọi chủ đề cũ giữ nguyên)
--   mode = 'sentence' → mẫu câu giao tiếp
--
-- `question_prompt` là câu hỏi đọc lên, chứa placeholder {tu} sẽ được thay bằng
-- nghĩa tiếng Việt của thẻ. Để trống thì dùng mẫu mặc định theo kiểu bài.
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent).
-- Chạy toàn bộ file này trong Supabase SQL Editor.

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'word',
  ADD COLUMN IF NOT EXISTS question_prompt TEXT DEFAULT '';

-- Ràng buộc giá trị hợp lệ. Tách khỏi ADD COLUMN vì chạy lại lần hai sẽ đụng
-- constraint đã có (ADD CONSTRAINT không hỗ trợ IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'topics_mode_check'
      AND conrelid = 'public.topics'::regclass
  ) THEN
    ALTER TABLE public.topics
      ADD CONSTRAINT topics_mode_check CHECK (mode IN ('word', 'sentence'));
    RAISE NOTICE 'Đã thêm ràng buộc topics_mode_check';
  ELSE
    RAISE NOTICE 'Bỏ qua — ràng buộc topics_mode_check đã tồn tại';
  END IF;
END $$;

-- ========================================================
-- KIỂM TRA KẾT QUẢ
-- ========================================================
SELECT name, mode, question_prompt
FROM public.topics
ORDER BY name;
