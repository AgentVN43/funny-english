import { DEFAULT_LANGUAGE } from "./types";
import type { Card, Language, TopicMode } from "./types";

/** Chỗ trong mẫu câu hỏi sẽ được thay bằng nghĩa tiếng Việt của thẻ */
export const PROMPT_PLACEHOLDER = "{tu}";

/** Tên ngôn ngữ khi đứng riêng làm nhãn — viết hoa */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: "Tiếng Anh",
  zh: "Tiếng Trung",
};

/**
 * Tên ngôn ngữ khi nằm giữa câu: "Tên tiếng Anh của …", không phải
 * "Tên Tiếng Anh của …".
 *
 * Chỉ hạ chữ cái đầu chứ không `toLowerCase()` cả chuỗi — "Anh", "Trung" là
 * danh từ riêng, hạ hết thành "tiếng anh" là sai.
 */
function languageInSentence(language: Language): string {
  const name = LANGUAGE_NAME[language];
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Mã ngôn ngữ cho bộ đọc — dùng cho cả giọng máy lẫn route /api/tts */
export const SPEECH_LANG: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
};

/**
 * Phiên âm để hiện lên màn hình. Trả về chuỗi rỗng khi thẻ chưa có — bên gọi
 * kiểm tra rỗng là bỏ qua, khỏi phải phân biệt null với chuỗi trắng.
 *
 * IPA tiếng Anh theo quy ước đặt giữa hai gạch chéo; pinyin tiếng Trung viết
 * trần vì không có quy ước đó.
 *
 * Đây chỉ là chuỗi HIỂN THỊ, không bao giờ đưa vào bộ đọc — đọc phiên âm lên
 * sẽ thành nghe hai lần cùng một từ.
 */
export function formatPronunciation(
  pronunciation: string | null | undefined,
  language: Language = DEFAULT_LANGUAGE
): string {
  const text = (pronunciation ?? "").trim();
  if (!text) return "";
  if (language !== "en") return text;
  // Admin gõ sẵn /…/ rồi thì đừng bọc thêm lần nữa thành //…//
  return text.startsWith("/") && text.endsWith("/") ? text : `/${text}/`;
}

/**
 * Mẫu câu hỏi mặc định khi chủ đề không đặt riêng.
 *
 * Chủ đề mẫu câu chỉ đọc thẳng câu tiếng Việt — thêm lời dẫn vào trước mỗi câu
 * sẽ dài dòng khi cả phiên có mười mấy câu liền nhau.
 */
function defaultPrompt(mode: TopicMode, language: Language): string {
  return mode === "sentence"
    ? PROMPT_PLACEHOLDER
    : `Tên ${languageInSentence(language)} của ${PROMPT_PLACEHOLDER} là gì?`;
}

/**
 * Dòng chữ hiện trên màn hình. Ngắn và cố định, không lặp lại nội dung thẻ —
 * nghĩa tiếng Việt đã nằm ngay bên dưới rồi.
 */
export function questionHeading(
  mode: TopicMode,
  language: Language = DEFAULT_LANGUAGE
): string {
  const name = languageInSentence(language);
  return mode === "sentence"
    ? `Câu này ${name} nói thế nào?`
    : `Từ ${name} là gì?`;
}

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
  template?: string | null,
  language: Language = DEFAULT_LANGUAGE
): string {
  // Cột trong database cho phép null, và thẻ tạo trước khi có cột này cũng
  // trả về null — không chặn ở đây thì cả trang học vỡ
  const subject = (card.meaning_vi ?? "").trim();
  if (!subject) return "";

  const pattern = (template ?? "").trim() || defaultPrompt(mode, language);
  const text = pattern.includes(PROMPT_PLACEHOLDER)
    ? pattern.split(PROMPT_PLACEHOLDER).join(subject)
    : `${pattern} ${subject}`;

  return text.replace(/\s+/g, " ").trim();
}
