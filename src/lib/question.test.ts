import { describe, expect, it } from "vitest";
import { buildQuestionText } from "./question";

const card = (meaning_vi: string) => ({ meaning_vi });

describe("buildQuestionText", () => {
  it("chủ đề từ vựng hỏi tên tiếng Anh của chính thẻ đó", () => {
    expect(buildQuestionText(card("con chó"), "word")).toBe(
      "Tên tiếng Anh của con chó là gì?"
    );
  });

  it("chủ đề mẫu câu đọc thẳng câu tiếng Việt, không thêm lời dẫn", () => {
    expect(
      buildQuestionText(card("Tôi có thể xem thực đơn được không?"), "sentence")
    ).toBe("Tôi có thể xem thực đơn được không?");
  });

  it("mẫu riêng của chủ đề thay được mẫu mặc định", () => {
    expect(
      buildQuestionText(card("quả táo"), "word", "Quả {tu} tiếng Anh gọi là gì?")
    ).toBe("Quả quả táo tiếng Anh gọi là gì?");
  });

  it("mẫu không có {tu} thì nối nghĩa tiếng Việt vào sau", () => {
    expect(
      buildQuestionText(card("con mèo"), "word", "Con vật này tiếng Anh là gì?")
    ).toBe("Con vật này tiếng Anh là gì? con mèo");
  });

  it("thay mọi chỗ xuất hiện của {tu}", () => {
    expect(buildQuestionText(card("cá"), "word", "{tu} — {tu} tiếng Anh?")).toBe(
      "cá — cá tiếng Anh?"
    );
  });

  it("mẫu chỉ có khoảng trắng coi như chưa đặt", () => {
    expect(buildQuestionText(card("con gà"), "word", "   ")).toBe(
      "Tên tiếng Anh của con gà là gì?"
    );
  });

  it("gộp khoảng trắng thừa để giọng đọc không ngắt quãng", () => {
    expect(buildQuestionText(card("  con vịt  "), "word")).toBe(
      "Tên tiếng Anh của con vịt là gì?"
    );
  });

  it("thẻ chưa có nghĩa tiếng Việt thì không đọc gì", () => {
    expect(buildQuestionText(card(""), "word")).toBe("");
    expect(buildQuestionText(card("   "), "sentence")).toBe("");
  });
});
