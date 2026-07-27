-- Migration: thêm bảng study_sessions — lịch sử từng buổi học
--
-- Bảng progress chỉ lưu tổng dồn theo từng thẻ nên không trả lời được
-- "ngày 27/7 vào học lúc mấy giờ, chủ đề hoa quả đúng bao nhiêu trên bao nhiêu".
-- Mỗi lần học một chủ đề sinh ra một dòng ở đây.
--
-- started_at = lúc trả lời câu đầu tiên
-- ended_at   = lúc trả lời câu gần nhất (cập nhật sau mỗi câu)
-- => buổi học bỏ dở vẫn có khoảng thời gian đúng, không cần xử lý NULL
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent).
-- Chạy toàn bộ file này trong Supabase SQL Editor.

-- ========================================================
-- BƯỚC 1: Tạo bảng
-- ========================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  -- Giữ lại tên chủ đề tại thời điểm học: xoá/đổi tên chủ đề sau này
  -- không được làm hỏng lịch sử đã ghi
  topic_name TEXT NOT NULL DEFAULT '',
  total_questions INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- BƯỚC 2: Index cho màn hình lịch sử (mới nhất trước)
-- ========================================================
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx
  ON public.study_sessions (user_id, started_at DESC);

-- ========================================================
-- BƯỚC 3: RLS
-- ========================================================
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'study_sessions'
      AND policyname = 'Users can manage own study sessions'
  ) THEN
    CREATE POLICY "Users can manage own study sessions"
      ON public.study_sessions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Đã tạo policy cho học viên';
  ELSE
    RAISE NOTICE 'Bỏ qua — policy học viên đã tồn tại';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'study_sessions'
      AND policyname = 'Admins can view all study sessions'
  ) THEN
    CREATE POLICY "Admins can view all study sessions"
      ON public.study_sessions FOR SELECT
      USING (public.is_admin());
    RAISE NOTICE 'Đã tạo policy cho admin';
  ELSE
    RAISE NOTICE 'Bỏ qua — policy admin đã tồn tại';
  END IF;
END $$;
