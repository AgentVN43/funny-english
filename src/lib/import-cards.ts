import type { TopicMode } from "./types";

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
  image: string;
  error?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  valid: ParsedRow[];
  invalid: ParsedRow[];
}

/** Mẫu nhập hiển thị trong ô nhập, khác nhau theo kiểu chủ đề */
export function importPlaceholder(mode: TopicMode): string {
  return mode === "sentence"
    ? "How are you? - Bạn khỏe không?\nWhat is your name? - Bạn tên là gì?"
    : "apple - quả táo - https://example.com/apple.jpg\nbanana - quả chuối";
}

export function importHint(mode: TopicMode): string {
  return mode === "sentence"
    ? "Mỗi dòng một câu, theo dạng: câu tiếng Anh - câu tiếng Việt"
    : "Mỗi dòng một từ, theo dạng: từ tiếng Anh - nghĩa tiếng Việt - link ảnh (link ảnh không bắt buộc)";
}

/**
 * Tách văn bản dán vào thành danh sách thẻ.
 * Bỏ qua dòng trống. Mỗi dòng lỗi được giữ lại kèm lý do để hiện cho admin sửa.
 */
export function parseImportText(
  text: string,
  mode: TopicMode
): ParseResult {
  const rows: ParsedRow[] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return; // bỏ qua dòng trống, không tính là lỗi

    const parts = trimmed.split(SEPARATOR).map((p) => p.trim());
    const word = parts[0] ?? "";

    if (mode === "sentence") {
      // Câu tiếng Việt có thể chứa " - ", nên ghép lại phần còn lại
      const meaning_vi = parts.slice(1).join(" - ").trim();
      rows.push({
        line,
        raw: trimmed,
        word,
        meaning_vi,
        image: "",
        error: !word
          ? "Thiếu câu tiếng Anh"
          : !meaning_vi
            ? "Thiếu câu tiếng Việt (dùng dấu ' - ' để ngăn cách)"
            : undefined,
      });
      return;
    }

    const meaning_vi = parts[1]?.trim() ?? "";
    const image = parts.slice(2).join(" - ").trim();
    rows.push({
      line,
      raw: trimmed,
      word,
      meaning_vi,
      image,
      error: !word
        ? "Thiếu từ tiếng Anh"
        : !meaning_vi
          ? "Thiếu nghĩa tiếng Việt (dùng dấu ' - ' để ngăn cách)"
          : undefined,
    });
  });

  return {
    rows,
    valid: rows.filter((r) => !r.error),
    invalid: rows.filter((r) => r.error),
  };
}
