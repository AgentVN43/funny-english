import { MASTERY_STREAK, OPTION_COUNT } from "./constants";
import { shuffleArray } from "./utils";
import type { Card } from "./types";

/** Phần tiến độ của một thẻ mà thuật toán chọn thẻ cần biết */
export interface CardProgress {
  card_id: string;
  streak: number;
  correct_count: number;
  wrong_count: number;
  last_reviewed: string | null;
}

export type ProgressMap = Record<string, CardProgress>;

export interface AnswerOption {
  id: string;
  text: string;
}

/** Hàm trộn mảng — tách ra để test có thể truyền bản tất định vào */
type Shuffle = <T>(items: T[]) => T[];

/** Càng sai nhiều so với số lần đúng thì càng yếu, càng cần học lại sớm */
function weakness(p: CardProgress): number {
  return p.wrong_count - p.correct_count;
}

/** Thời điểm ôn gần nhất; chưa ôn bao giờ coi như rất lâu rồi */
function reviewedAt(p: CardProgress): number {
  if (!p.last_reviewed) return 0;
  const t = Date.parse(p.last_reviewed);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Chọn thẻ cho một phiên học, ưu tiên theo thứ tự:
 *   1. Thẻ chưa từng học
 *   2. Thẻ đang học — sai nhiều xếp trước, cùng mức thì lâu chưa ôn xếp trước
 *   3. Thẻ đã thuộc — chỉ lấy khi chưa đủ số lượng, lâu chưa ôn xếp trước
 *
 * Thứ tự xuất hiện trong phiên được trộn lại để không đoán được nhóm ưu tiên.
 */
export function selectSessionCards(
  cards: Card[],
  progress: ProgressMap,
  limit: number,
  shuffle: Shuffle = shuffleArray
): Card[] {
  if (limit <= 0) return [];

  const fresh: Card[] = [];
  const learning: Card[] = [];
  const mastered: Card[] = [];

  for (const card of cards) {
    const p = progress[card.id];
    if (!p) fresh.push(card);
    else if (p.streak < MASTERY_STREAK) learning.push(card);
    else mastered.push(card);
  }

  learning.sort((a, b) => {
    const pa = progress[a.id];
    const pb = progress[b.id];
    const diff = weakness(pb) - weakness(pa);
    return diff !== 0 ? diff : reviewedAt(pa) - reviewedAt(pb);
  });

  mastered.sort((a, b) => reviewedAt(progress[a.id]) - reviewedAt(progress[b.id]));

  const picked = [...shuffle(fresh), ...learning, ...mastered].slice(0, limit);
  return shuffle(picked);
}

/**
 * Dựng danh sách đáp án cho một câu hỏi.
 *
 * `pool` phải là TOÀN BỘ thẻ có thể dùng làm nhiễu (cả chủ đề, không phải
 * riêng các thẻ của phiên) — nếu không, đáp án sẽ lặp lại và đoán được.
 * Thẻ trùng chữ với đáp án đúng bị loại để không có hai đáp án cùng đúng.
 */
export function buildOptions(
  correct: Card,
  pool: Card[],
  optionCount: number = OPTION_COUNT,
  shuffle: Shuffle = shuffleArray
): AnswerOption[] {
  const correctWord = correct.word.trim().toLowerCase();

  const seen = new Set<string>([correctWord]);
  const candidates: Card[] = [];
  for (const card of pool) {
    if (card.id === correct.id) continue;
    const word = card.word.trim().toLowerCase();
    if (seen.has(word)) continue;
    seen.add(word);
    candidates.push(card);
  }

  const distractors = shuffle(candidates).slice(0, Math.max(0, optionCount - 1));
  return shuffle(
    [correct, ...distractors].map((c) => ({ id: c.id, text: c.word }))
  );
}
