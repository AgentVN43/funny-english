import { describe, expect, it } from "vitest";
import { importHint, importPlaceholder, parseImportText } from "./import-cards";

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

  it("tiếng Anh không có cột pinyin — phiên âm luôn null, nhập tay sau", () => {
    const { valid } = parseImportText(
      "apple - quả táo - https://example.com/a.jpg",
      "word",
      "en"
    );
    expect(valid[0].pronunciation).toBeNull();
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

describe("parseImportText — chủ đề tiếng Trung có cột pinyin", () => {
  it("từ vựng: chữ Hán - pinyin - nghĩa - ảnh", () => {
    const { valid } = parseImportText(
      "苹果 - píngguǒ - quả táo - https://example.com/a.jpg",
      "word",
      "zh"
    );
    expect(valid[0]).toMatchObject({
      word: "苹果",
      pronunciation: "píngguǒ",
      meaning_vi: "quả táo",
      image: "https://example.com/a.jpg",
    });
  });

  it("từ vựng: link ảnh không bắt buộc", () => {
    const { valid } = parseImportText("香蕉 - xiāngjiāo - quả chuối", "word", "zh");
    expect(valid[0]).toMatchObject({
      word: "香蕉",
      pronunciation: "xiāngjiāo",
      meaning_vi: "quả chuối",
      image: "",
    });
  });

  it("mẫu câu: câu Hán - pinyin - câu Việt", () => {
    const { valid } = parseImportText(
      "你好吗? - Nǐ hǎo ma? - Bạn khỏe không?",
      "sentence",
      "zh"
    );
    expect(valid[0]).toMatchObject({
      word: "你好吗?",
      pronunciation: "Nǐ hǎo ma?",
      meaning_vi: "Bạn khỏe không?",
    });
  });

  it("câu tiếng Việt chứa gạch ngang vẫn giữ nguyên sau khi đã tách pinyin", () => {
    const { valid } = parseImportText(
      "等一下 - Děng yīxià - Đợi một chút - tôi sắp xong",
      "sentence",
      "zh"
    );
    expect(valid[0].meaning_vi).toBe("Đợi một chút - tôi sắp xong");
  });

  it("chỉ có 2 cột thì cột thứ hai được hiểu là pinyin, nghĩa coi như thiếu", () => {
    // Không thể phân biệt "thiếu pinyin" với "thiếu nghĩa" khi chỉ có 2 cột —
    // cột pinyin đứng trước theo đúng vị trí bắt buộc nên được ưu tiên đọc trước
    const { invalid } = parseImportText("苹果 - quả táo", "word", "zh");
    expect(invalid[0].pronunciation).toBe("quả táo");
    expect(invalid[0].error).toContain("Thiếu nghĩa tiếng Việt");
  });

  it("chỉ có 1 cột thì báo thiếu pinyin, không phải thiếu nghĩa", () => {
    const { invalid } = parseImportText("苹果", "word", "zh");
    expect(invalid[0].error).toContain("Thiếu pinyin");
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

  it("chấp nhận nhiều khoảng trắng quanh dấu phân cách kể cả có cột pinyin", () => {
    const { valid } = parseImportText(
      "苹果   -   píngguǒ   -   quả táo",
      "word",
      "zh"
    );
    expect(valid[0]).toMatchObject({
      word: "苹果",
      pronunciation: "píngguǒ",
      meaning_vi: "quả táo",
    });
  });
});

describe("importPlaceholder / importHint — đổi theo ngôn ngữ", () => {
  it("tiếng Anh không nhắc đến pinyin", () => {
    expect(importPlaceholder("word", "en")).not.toContain("pinyin");
    expect(importHint("word", "en")).not.toContain("pinyin");
  });

  it("tiếng Trung có nhắc pinyin trong cả mẫu và hướng dẫn", () => {
    expect(importPlaceholder("word", "zh")).toContain("píngguǒ");
    expect(importHint("word", "zh")).toContain("pinyin");
    expect(importHint("sentence", "zh")).toContain("pinyin");
  });

  it("không truyền ngôn ngữ thì mặc định tiếng Anh — giữ nguyên hành vi cũ", () => {
    expect(importPlaceholder("word")).toBe(importPlaceholder("word", "en"));
  });
});
