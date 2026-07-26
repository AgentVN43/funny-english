/** Trả lời đúng liên tiếp bao nhiêu lần thì coi là đã thuộc */
export const MASTERY_STREAK = 3;

/** Số thẻ mỗi phiên khi người dùng chưa có cài đặt riêng */
export const DEFAULT_CARDS_PER_SESSION = 10;

/** Số đáp án hiển thị mỗi câu hỏi */
export const OPTION_COUNT = 4;

/** Một thẻ được coi là đã thuộc khi chuỗi đúng đạt ngưỡng */
export function isMastered(streak: number | undefined | null): boolean {
  return (streak ?? 0) >= MASTERY_STREAK;
}
