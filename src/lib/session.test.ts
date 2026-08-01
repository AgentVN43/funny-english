import { describe, expect, it } from "vitest";
import { buildOptions, selectSessionCards } from "./session";
import type { CardProgress, ProgressMap } from "./session";
import { MASTERY_STREAK, OPTION_COUNT } from "./constants";
import type { Card } from "./types";

/** Trộn tất định để test kiểm được kết quả — giữ nguyên thứ tự đầu vào */
const noShuffle = <T,>(items: T[]): T[] => [...items];
/** Trộn tất định kiểu đảo ngược — dùng để chắc chắn code không phụ thuộc thứ tự */
const reverse = <T,>(items: T[]): T[] => [...items].reverse();

function card(id: string, word = id, meaning = `nghĩa ${id}`): Card {
  return {
    id,
    topic_id: "t1",
    word,
    meaning_vi: meaning,
    pronunciation: null,
    image: "",
    created_at: "",
    updated_at: "",
  };
}

function progress(
  card_id: string,
  overrides: Partial<CardProgress> = {}
): CardProgress {
  return {
    card_id,
    streak: 0,
    correct_count: 0,
    wrong_count: 0,
    last_reviewed: null,
    ...overrides,
  };
}

function toMap(rows: CardProgress[]): ProgressMap {
  return Object.fromEntries(rows.map((r) => [r.card_id, r]));
}

describe("selectSessionCards", () => {
  const deck = ["a", "b", "c", "d", "e"].map((id) => card(id));

  it("ưu tiên thẻ chưa từng học trước thẻ đã thuộc", () => {
    const map = toMap([
      progress("a", { streak: 5, correct_count: 5 }),
      progress("b", { streak: 4, correct_count: 4 }),
    ]);
    const picked = selectSessionCards(deck, map, 3, noShuffle);
    expect(picked.map((c) => c.id).sort()).toEqual(["c", "d", "e"]);
  });

  it("thẻ đang học được ưu tiên hơn thẻ đã thuộc", () => {
    const map = toMap([
      progress("a", { streak: MASTERY_STREAK, correct_count: 3 }),
      progress("b", { streak: MASTERY_STREAK, correct_count: 3 }),
      progress("c", { streak: MASTERY_STREAK, correct_count: 3 }),
      progress("d", { streak: MASTERY_STREAK, correct_count: 3 }),
      progress("e", { streak: 1, correct_count: 1, wrong_count: 2 }),
    ]);
    const picked = selectSessionCards(deck, map, 1, noShuffle);
    expect(picked.map((c) => c.id)).toEqual(["e"]);
  });

  it("trong nhóm đang học, thẻ sai nhiều hơn được ưu tiên", () => {
    const map = toMap([
      progress("a", { streak: 1, correct_count: 5, wrong_count: 0 }),
      progress("b", { streak: 0, correct_count: 1, wrong_count: 6 }),
      progress("c", { streak: 1, correct_count: 3, wrong_count: 2 }),
      progress("d", { streak: 2, correct_count: 4, wrong_count: 1 }),
      progress("e", { streak: 2, correct_count: 4, wrong_count: 1 }),
    ]);
    const picked = selectSessionCards(deck, map, 2, noShuffle);
    expect(picked.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("cùng mức yếu thì thẻ lâu chưa ôn được ưu tiên", () => {
    const map = toMap([
      progress("a", {
        streak: 1,
        correct_count: 1,
        wrong_count: 1,
        last_reviewed: "2026-07-20T00:00:00Z",
      }),
      progress("b", {
        streak: 1,
        correct_count: 1,
        wrong_count: 1,
        last_reviewed: "2026-01-01T00:00:00Z",
      }),
    ]);
    const picked = selectSessionCards([card("a"), card("b")], map, 1, noShuffle);
    expect(picked.map((c) => c.id)).toEqual(["b"]);
  });

  it("vẫn lấy thẻ đã thuộc khi không còn thẻ nào khác", () => {
    const map = toMap(
      deck.map((c) => progress(c.id, { streak: 9, correct_count: 9 }))
    );
    const picked = selectSessionCards(deck, map, 3, noShuffle);
    expect(picked).toHaveLength(3);
  });

  it("thẻ đã thuộc lâu chưa ôn nhất được lấy trước", () => {
    const map = toMap([
      progress("a", { streak: 9, last_reviewed: "2026-07-25T00:00:00Z" }),
      progress("b", { streak: 9, last_reviewed: "2026-02-01T00:00:00Z" }),
      progress("c", { streak: 9, last_reviewed: "2026-07-01T00:00:00Z" }),
    ]);
    const picked = selectSessionCards(
      [card("a"), card("b"), card("c")],
      map,
      1,
      noShuffle
    );
    expect(picked.map((c) => c.id)).toEqual(["b"]);
  });

  it("không lấy quá số lượng yêu cầu", () => {
    expect(selectSessionCards(deck, {}, 2, noShuffle)).toHaveLength(2);
  });

  it("lấy hết khi yêu cầu nhiều hơn số thẻ hiện có", () => {
    expect(selectSessionCards(deck, {}, 100, noShuffle)).toHaveLength(5);
  });

  it("trả về rỗng khi giới hạn bằng 0 hoặc âm", () => {
    expect(selectSessionCards(deck, {}, 0, noShuffle)).toEqual([]);
    expect(selectSessionCards(deck, {}, -1, noShuffle)).toEqual([]);
  });

  it("trả về rỗng khi không có thẻ nào", () => {
    expect(selectSessionCards([], {}, 10, noShuffle)).toEqual([]);
  });

  it("last_reviewed hỏng không làm vỡ việc sắp xếp", () => {
    const map = toMap([
      progress("a", { streak: 9, last_reviewed: "không phải ngày" }),
      progress("b", { streak: 9, last_reviewed: "2026-07-25T00:00:00Z" }),
    ]);
    const picked = selectSessionCards([card("a"), card("b")], map, 2, noShuffle);
    expect(picked).toHaveLength(2);
  });

  it("thứ tự ưu tiên không phụ thuộc thứ tự thẻ đầu vào", () => {
    const map = toMap([
      progress("a", { streak: 9, correct_count: 9 }),
      progress("b", { streak: 1, correct_count: 1, wrong_count: 4 }),
    ]);
    const forward = selectSessionCards([card("a"), card("b")], map, 1, noShuffle);
    const backward = selectSessionCards([card("b"), card("a")], map, 1, noShuffle);
    expect(forward.map((c) => c.id)).toEqual(["b"]);
    expect(backward.map((c) => c.id)).toEqual(["b"]);
  });
});

describe("buildOptions", () => {
  const deck = ["a", "b", "c", "d", "e", "f"].map((id) => card(id));

  it("luôn có đáp án đúng trong danh sách", () => {
    const opts = buildOptions(deck[0], deck, OPTION_COUNT, noShuffle);
    expect(opts.some((o) => o.id === "a")).toBe(true);
  });

  it("trả về đúng 4 lựa chọn khi nguồn đủ thẻ", () => {
    expect(buildOptions(deck[0], deck, OPTION_COUNT, noShuffle)).toHaveLength(4);
  });

  it("không lặp lại đáp án", () => {
    const opts = buildOptions(deck[2], deck, OPTION_COUNT, noShuffle);
    expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
  });

  it("dùng được nguồn nhiễu lớn hơn số thẻ của phiên — lỗi cũ đã sửa", () => {
    // Phiên chỉ có 3 thẻ nhưng chủ đề có 40 thẻ: nhiễu phải rút từ cả 40
    const session = deck.slice(0, 3);
    const wholeTopic = Array.from({ length: 40 }, (_, i) => card(`w${i}`));
    const opts = buildOptions(session[0], wholeTopic, OPTION_COUNT, noShuffle);
    expect(opts).toHaveLength(4);
    const fromSession = opts.filter((o) =>
      session.some((s) => s.id === o.id)
    );
    expect(fromSession).toHaveLength(1); // chỉ đáp án đúng
  });

  it("loại thẻ trùng chữ để không có hai đáp án cùng đúng", () => {
    const pool = [
      card("x1", "apple"),
      card("x2", "apple"), // trùng chữ với đáp án đúng
      card("x3", "banana"),
      card("x4", "cat"),
      card("x5", "dog"),
    ];
    const opts = buildOptions(pool[0], pool, OPTION_COUNT, noShuffle);
    const appleCount = opts.filter(
      (o) => o.text.toLowerCase() === "apple"
    ).length;
    expect(appleCount).toBe(1);
  });

  it("bỏ qua khác biệt hoa thường và khoảng trắng khi lọc trùng", () => {
    const pool = [
      card("x1", "Apple"),
      card("x2", " apple "),
      card("x3", "banana"),
    ];
    const opts = buildOptions(pool[0], pool, OPTION_COUNT, noShuffle);
    expect(opts).toHaveLength(2);
  });

  it("chủ đề chỉ có 2 thẻ thì hiện 2 lựa chọn, không vỡ", () => {
    const tiny = [card("a"), card("b")];
    const opts = buildOptions(tiny[0], tiny, OPTION_COUNT, noShuffle);
    expect(opts).toHaveLength(2);
    expect(opts.some((o) => o.id === "a")).toBe(true);
  });

  it("nguồn chỉ có mỗi đáp án đúng vẫn trả về 1 lựa chọn", () => {
    const one = [card("a")];
    expect(buildOptions(one[0], one, OPTION_COUNT, noShuffle)).toHaveLength(1);
  });

  it("nguồn rỗng vẫn trả về đáp án đúng", () => {
    const opts = buildOptions(card("a"), [], OPTION_COUNT, noShuffle);
    expect(opts).toEqual([{ id: "a", text: "a" }]);
  });

  it("kết quả không phụ thuộc chiều trộn", () => {
    const forward = buildOptions(deck[0], deck, OPTION_COUNT, noShuffle);
    const backward = buildOptions(deck[0], deck, OPTION_COUNT, reverse);
    expect(forward).toHaveLength(4);
    expect(backward).toHaveLength(4);
    expect(backward.some((o) => o.id === "a")).toBe(true);
  });

  it("optionCount = 1 chỉ trả về đáp án đúng", () => {
    const opts = buildOptions(deck[0], deck, 1, noShuffle);
    expect(opts).toEqual([{ id: "a", text: "a" }]);
  });
});

describe("phiên học đầu-cuối", () => {
  it("mọi câu hỏi trong phiên đều có đáp án đúng và không trùng lựa chọn", () => {
    const topic = Array.from({ length: 40 }, (_, i) => card(`c${i}`, `word${i}`));
    const map = toMap([
      progress("c0", { streak: 9, correct_count: 9 }),
      progress("c1", { streak: 1, correct_count: 1, wrong_count: 3 }),
    ]);

    const session = selectSessionCards(topic, map, 10, noShuffle);
    expect(session).toHaveLength(10);
    // Thẻ đã thuộc bị đẩy xuống cuối nên không lọt vào phiên 10 thẻ
    expect(session.some((c) => c.id === "c0")).toBe(false);

    for (const q of session) {
      const opts = buildOptions(q, topic, OPTION_COUNT, noShuffle);
      expect(opts).toHaveLength(4);
      expect(opts.filter((o) => o.id === q.id)).toHaveLength(1);
      expect(new Set(opts.map((o) => o.text)).size).toBe(4);
    }
  });
});
