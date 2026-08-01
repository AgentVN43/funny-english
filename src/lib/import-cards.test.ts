import { describe, expect, it } from "vitest";
import { parseImportText } from "./import-cards";

describe("parseImportText — chủ đề từ vựng", () => {
  it("tách được từ, nghĩa và link ảnh", () => {
    const { valid } = parseImportText(
      "apple - quả táo - https://example.com/a.jpg",
      "word"
    );
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      word: "apple",
      meaning_vi: "quả táo",
      image: "https://example.com/a.jpg",
    });
  });

  it("link ảnh không bắt buộc", () => {
    const { valid } = parseImportText("banana - quả chuối", "word");
    expect(valid[0]).toMatchObject({
      word: "banana",
      meaning_vi: "quả chuối",
      image: "",
    });
  });

  it("không cắt nhầm từ ghép có gạch ngang", () => {
    const { valid } = parseImportText("T-shirt - áo phông", "word");
    expect(valid[0]).toMatchObject({ word: "T-shirt", meaning_vi: "áo phông" });
  });

  it("không cắt nhầm link ảnh có gạch ngang", () => {
    const { valid } = parseImportText(
      "mango - quả xoài - https://cdn.com/anh-trai-cay.jpg",
      "word"
    );
    expect(valid[0].image).toBe("https://cdn.com/anh-trai-cay.jpg");
  });

  it("thiếu nghĩa tiếng Việt thì báo lỗi kèm số dòng", () => {
    const { valid, invalid } = parseImportText("apple - quả táo\norange", "word");
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].line).toBe(2);
    expect(invalid[0].error).toContain("Thiếu nghĩa tiếng Việt");
  });
});

describe("parseImportText — chủ đề mẫu câu", () => {
  it("tách câu tiếng Anh và câu tiếng Việt", () => {
    const { valid } = parseImportText(
      "How are you? - Bạn khỏe không?",
      "sentence"
    );
    expect(valid[0]).toMatchObject({
      word: "How are you?",
      meaning_vi: "Bạn khỏe không?",
      image: "",
    });
  });

  it("câu tiếng Việt chứa dấu gạch ngang vẫn giữ nguyên", () => {
    const { valid } = parseImportText(
      "Wait a moment - Đợi một chút - tôi sắp xong",
      "sentence"
    );
    expect(valid[0].meaning_vi).toBe("Đợi một chút - tôi sắp xong");
  });

  it("thiếu câu tiếng Việt thì báo lỗi", () => {
    const { invalid } = parseImportText("How are you?", "sentence");
    expect(invalid[0].error).toContain("Thiếu câu tiếng Việt");
  });
});

describe("parseImportText — chung", () => {
  it("bỏ qua dòng trống, không tính là lỗi", () => {
    const { rows, valid, invalid } = parseImportText(
      "apple - quả táo\n\n   \nbanana - quả chuối",
      "word"
    );
    expect(rows).toHaveLength(2);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it("số dòng báo lỗi tính theo văn bản gốc, kể cả khi có dòng trống", () => {
    const { invalid } = parseImportText("apple - quả táo\n\norange", "word");
    expect(invalid[0].line).toBe(3);
  });

  it("chấp nhận nhiều khoảng trắng quanh dấu phân cách", () => {
    const { valid } = parseImportText("apple   -   quả táo", "word");
    expect(valid[0]).toMatchObject({ word: "apple", meaning_vi: "quả táo" });
  });

  it("văn bản rỗng cho kết quả rỗng", () => {
    expect(parseImportText("", "word").rows).toHaveLength(0);
  });
});
