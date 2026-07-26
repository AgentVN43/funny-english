-- Kiểm tra trạng thái DB hiện tại trước khi migrate
-- Chạy trong Supabase SQL Editor, gửi kết quả lại

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('categories', 'topics', 'cards')
ORDER BY table_name, ordinal_position;
