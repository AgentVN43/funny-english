import { describe, expect, it } from "vitest";
import { buildQuestionText, questionHeading, SPEECH_LANG } from "./question";

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

describe("buildQuestionText — nhiều ngôn ngữ", () => {
  it("chủ đề tiếng Trung hỏi tên tiếng Trung, không phải tiếng Anh", () => {
    expect(buildQuestionText(card("con chó"), "word", null, "zh")).toBe(
      "Tên tiếng Trung của con chó là gì?"
    );
  });

  it("không truyền ngôn ngữ thì mặc định tiếng Anh — giữ nguyên nội dung cũ", () => {
    expect(buildQuestionText(card("con chó"), "word")).toBe(
      "Tên tiếng Anh của con chó là gì?"
    );
  });

  it("chủ đề mẫu câu tiếng Trung vẫn chỉ đọc câu tiếng Việt", () => {
    expect(buildQuestionText(card("Bạn tên gì?"), "sentence", null, "zh")).toBe(
      "Bạn tên gì?"
    );
  });

  it("mẫu riêng của chủ đề vẫn thắng mẫu mặc định theo ngôn ngữ", () => {
    expect(
      buildQuestionText(card("quả táo"), "word", "{tu} đọc thế nào?", "zh")
    ).toBe("quả táo đọc thế nào?");
  });
});

describe("questionHeading", () => {
  it("đổi theo ngôn ngữ của chủ đề", () => {
    expect(questionHeading("word", "en")).toBe("Từ tiếng Anh là gì?");
    expect(questionHeading("word", "zh")).toBe("Từ tiếng Trung là gì?");
    expect(questionHeading("sentence", "zh")).toBe(
      "Câu này tiếng Trung nói thế nào?"
    );
  });

  it("mặc định tiếng Anh khi chưa biết ngôn ngữ", () => {
    expect(questionHeading("word")).toBe("Từ tiếng Anh là gì?");
    expect(questionHeading("sentence")).toBe("Câu này tiếng Anh nói thế nào?");
  });
});

describe("SPEECH_LANG", () => {
  it("mỗi ngôn ngữ có mã giọng đọc riêng", () => {
    expect(SPEECH_LANG.en).toBe("en-US");
    expect(SPEECH_LANG.zh).toBe("zh-CN");
  });
});
