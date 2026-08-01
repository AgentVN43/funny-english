import { DEFAULT_LANGUAGE } from "./types";
import type { Language, TopicMode } from "./types";

/**
 * Dấu phân cách giữa các cột: gạch ngang có khoảng trắng hai bên.
 * Dùng `\s+-\s+` chứ không phải "-" trần để không cắt nhầm từ ghép
 * ("T-shirt", "e-mail") hay link ảnh ("anh-trai-cay.jpg").
 */
const SEPARATOR = /\s+-\s+/;

export interface ParsedRow {
  /** Số dòng trong ô nhập, tính từ 1 — để báo lỗi cho đúng chỗ */
  line: number;
  raw: string;
  word: string;
  meaning_vi: string;
  /** Pinyin cho tiếng Trung; tiếng Anh nhập tay sau nên để null */
  pronunciation: string | null;
  image: string;
  error?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  valid: ParsedRow[];
  invalid: ParsedRow[];
}

/**
 * Tiếng Trung có thêm cột phiên âm ngay sau chữ Hán.
 *
 * Bắt buộc chứ không để tuỳ chọn: thiếu nó thì dòng hai cột không phân biệt
 * được là "chữ Hán - pinyin" hay "chữ Hán - nghĩa", đoán sai sẽ ghi nhầm nghĩa
 * vào ô phiên âm. Tiếng Anh giữ nguyên định dạng cũ, IPA nhập sau bằng tay.
 */
function hasPinyinColumn(language: Language): boolean {
  return language === "zh";
}

/** Mẫu nhập hiển thị trong ô nhập, khác nhau theo kiểu chủ đề và ngôn ngữ */
export function importPlaceholder(
  mode: TopicMode,
  language: Language = DEFAULT_LANGUAGE
): string {
  if (hasPinyinColumn(language)) {
    return mode === "sentence"
      ? "你好吗? - Nǐ hǎo ma? - Bạn khỏe không?\n你叫什么名字? - Nǐ jiào shénme míngzì? - Bạn tên là gì?"
      : "苹果 - píngguǒ - quả táo - https://example.com/apple.jpg\n香蕉 - xiāngjiāo - quả chuối";
  }
  return mode === "sentence"
    ? "How are you? - Bạn khỏe không?\nWhat is your name? - Bạn tên là gì?"
    : "apple - quả táo - https://example.com/apple.jpg\nbanana - quả chuối";
}

export function importHint(
  mode: TopicMode,
  language: Language = DEFAULT_LANGUAGE
): string {
  if (hasPinyinColumn(language)) {
    return mode === "sentence"
      ? "Mỗi dòng một câu, theo dạng: câu tiếng Trung - pinyin - câu tiếng Việt"
      : "Mỗi dòng một từ, theo dạng: chữ Hán - pinyin - nghĩa tiếng Việt - link ảnh (link ảnh không bắt buộc)";
  }
  return mode === "sentence"
    ? "Mỗi dòng một câu, theo dạng: câu tiếng Anh - câu tiếng Việt"
    : "Mỗi dòng một từ, theo dạng: từ tiếng Anh - nghĩa tiếng Việt - link ảnh (link ảnh không bắt buộc). Phiên âm IPA nhập sau bằng tay.";
}

/** Tách một dòng theo đúng số cột của ngôn ngữ và kiểu bài */
function parseLine(
  raw: string,
  line: number,
  mode: TopicMode,
  language: Language
): ParsedRow {
  const parts = raw.split(SEPARATOR).map((p) => p.trim());
  const word = parts[0] ?? "";
  const isSentence = mode === "sentence";
  const withPinyin = hasPinyinColumn(language);

  // Cột phiên âm nằm ngay sau chữ Hán, các cột còn lại dịch sang một bậc
  const pronunciation = withPinyin ? (parts[1]?.trim() ?? "") : "";
  const rest = parts.slice(withPinyin ? 2 : 1);

  // Câu tiếng Việt có thể chứa " - " nên ghép lại phần còn lại;
  // từ vựng thì nghĩa chỉ một cột, phần dư là link ảnh
  const meaning_vi = isSentence ? rest.join(" - ").trim() : (rest[0]?.trim() ?? "");
  const image = isSentence ? "" : rest.slice(1).join(" - ").trim();

  const subject = isSentence
    ? withPinyin
      ? "câu tiếng Trung"
      : "câu tiếng Anh"
    : withPinyin
      ? "chữ Hán"
      : "từ tiếng Anh";
  const target = isSentence ? "câu tiếng Việt" : "nghĩa tiếng Việt";

  let error: string | undefined;
  if (!word) {
    error = `Thiếu ${subject}`;
  } else if (withPinyin && !pronunciation) {
    error = "Thiếu pinyin (dùng dấu ' - ' để ngăn cách)";
  } else if (!meaning_vi) {
    error = `Thiếu ${target} (dùng dấu ' - ' để ngăn cách)`;
  }

  return {
    line,
    raw,
    word,
    meaning_vi,
    pronunciation: pronunciation || null,
    image,
    error,
  };
}

/**
 * Tách văn bản dán vào thành danh sách thẻ.
 * Bỏ qua dòng trống. Mỗi dòng lỗi được giữ lại kèm lý do để hiện cho admin sửa.
 */
export function parseImportText(
  text: string,
  mode: TopicMode,
  language: Language = DEFAULT_LANGUAGE
): ParseResult {
  const rows: ParsedRow[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed) return; // bỏ qua dòng trống, không tính là lỗi
    rows.push(parseLine(trimmed, i + 1, mode, language));
  });

  return {
    rows,
    valid: rows.filter((r) => !r.error),
    invalid: rows.filter((r) => r.error),
  };
}
