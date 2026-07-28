-- Migration: hỗ trợ màn hình "Theo dõi học viên" của admin
--
-- Màn hình này đọc study_sessions của TẤT CẢ học viên trong một lượt rồi chia
-- theo người ở client. Index sẵn có là (user_id, started_at DESC) nên không
-- dùng được cho truy vấn không lọc theo user — thêm index chỉ theo started_at.
--
-- Quyền đọc thì migration_study_sessions.sql đã lo (policy "Admins can view
-- all study sessions"), file này chỉ lo phần tốc độ.
--
-- AN TOÀN CHẠY LẠI NHIỀU LẦN (idempotent).
-- Chạy toàn bộ file này trong Supabase SQL Editor.

CREATE INDEX IF NOT EXISTS study_sessions_started_idx
  ON public.study_sessions (started_at DESC);
