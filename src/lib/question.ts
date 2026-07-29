import type { Card, TopicMode } from "./types";

/** Chỗ trong mẫu câu hỏi sẽ được thay bằng nghĩa tiếng Việt của thẻ */
export const PROMPT_PLACEHOLDER = "{tu}";

/**
 * Mẫu câu hỏi mặc định khi chủ đề không đặt riêng.
 *
 * Chủ đề mẫu câu chỉ đọc thẳng câu tiếng Việt — thêm lời dẫn vào trước mỗi câu
 * sẽ dài dòng khi cả phiên có mười mấy câu liền nhau.
 */
const DEFAULT_PROMPT: Record<TopicMode, string> = {
  word: `Tên tiếng Anh của ${PROMPT_PLACEHOLDER} là gì?`,
  sentence: PROMPT_PLACEHOLDER,
};

/**
 * Dòng chữ hiện trên màn hình. Ngắn và cố định, không lặp lại nội dung thẻ —
 * nghĩa tiếng Việt đã nằm ngay bên dưới rồi.
 */
export const QUESTION_HEADING: Record<TopicMode, string> = {
  word: "Từ tiếng Anh là gì?",
  sentence: "Câu này tiếng Anh nói thế nào?",
};

/**
 * Câu hỏi đọc lên bằng tiếng Việt cho một thẻ.
 *
 * Mẫu không chứa `{tu}` thì nghĩa tiếng Việt được nối vào sau — admin gõ
 * "Con vật này tiếng Anh gọi là gì?" vẫn ra câu đọc đủ ý, không phải nhớ cú
 * pháp placeholder.
 *
 * Thẻ chưa có nghĩa tiếng Việt trả về chuỗi rỗng để bên gọi im lặng bỏ qua,
 * thay vì đọc lên một câu hỏi cụt.
 */
export function buildQuestionText(
  card: Pick<Card, "meaning_vi">,
  mode: TopicMode,
  template?: string | null
): string {
  // Cột trong database cho phép null, và thẻ tạo trước khi có cột này cũng
  // trả về null — không chặn ở đây thì cả trang học vỡ
  const subject = (card.meaning_vi ?? "").trim();
  if (!subject) return "";

  const pattern = (template ?? "").trim() || DEFAULT_PROMPT[mode];
  const text = pattern.includes(PROMPT_PLACEHOLDER)
    ? pattern.split(PROMPT_PLACEHOLDER).join(subject)
    : `${pattern} ${subject}`;

  return text.replace(/\s+/g, " ").trim();
}
