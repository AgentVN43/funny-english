import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSpeech, shuffleArray, speakText } from "./utils";

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: unknown = null;
  constructor(public text: string) {}
}

class FakeSpeechSynthesis {
  spoken: FakeUtterance[] = [];
  cancelCount = 0;
  voices: { name: string; lang: string }[] = [];

  getVoices() {
    return this.voices;
  }

  cancel() {
    this.cancelCount++;
  }

  speak(u: FakeUtterance) {
    this.spoken.push(u);
  }
}

let synth: FakeSpeechSynthesis;

beforeEach(() => {
  synth = new FakeSpeechSynthesis();
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shuffleArray", () => {
  it("không sửa mảng gốc", () => {
    const original = [1, 2, 3, 4, 5];
    shuffleArray(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it("giữ nguyên đủ các phần tử", () => {
    expect([...shuffleArray([1, 2, 3, 4, 5])].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("mảng rỗng và mảng một phần tử vẫn chạy", () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([9])).toEqual([9]);
  });
});

describe("speakText", () => {
  it("đọc đúng một lần, đúng một từ", () => {
    speakText("apple");
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].text).toBe("apple");
  });

  it("không đọc thêm câu tiếng Việt nào trước từ vựng", () => {
    speakText("banana");
    expect(synth.spoken.map((u) => u.text)).toEqual(["banana"]);
    expect(synth.spoken.every((u) => u.lang === "en-US")).toBe(true);
  });

  it("huỷ phần đang đọc dở trước khi đọc từ mới", () => {
    speakText("apple");
    expect(synth.cancelCount).toBe(1);
  });

  it("trả lời nhanh hai câu liên tiếp không bị đọc chồng tiếng", () => {
    speakText("apple");
    speakText("banana");
    // Mỗi lượt huỷ lượt trước nên hàng đợi không dồn lại
    expect(synth.cancelCount).toBe(2);
    expect(synth.spoken.map((u) => u.text)).toEqual(["apple", "banana"]);
  });

  it("đặt tốc độ đọc chậm hơn bình thường cho trẻ nghe kịp", () => {
    speakText("elephant");
    expect(synth.spoken[0].rate).toBe(0.9);
  });

  it("đổi được ngôn ngữ khi cần", () => {
    speakText("xin chào", "vi-VN");
    expect(synth.spoken[0].lang).toBe("vi-VN");
  });

  it("bỏ qua chuỗi rỗng hoặc chỉ có khoảng trắng", () => {
    speakText("");
    speakText("   ");
    expect(synth.spoken).toHaveLength(0);
  });

  it("ưu tiên giọng nữ khi thiết bị có", () => {
    synth.voices = [
      { name: "Microsoft David", lang: "en-US" },
      { name: "Microsoft Zira", lang: "en-US" },
    ];
    speakText("apple");
    expect((synth.spoken[0].voice as { name: string }).name).toBe(
      "Microsoft Zira"
    );
  });

  it("không có giọng nữ thì lấy giọng đầu tiên đúng ngôn ngữ", () => {
    synth.voices = [
      { name: "Giọng tiếng Pháp", lang: "fr-FR" },
      { name: "Microsoft Mark", lang: "en-US" },
    ];
    speakText("apple");
    expect((synth.spoken[0].voice as { name: string }).name).toBe(
      "Microsoft Mark"
    );
  });

  it("không vỡ khi thiết bị không hỗ trợ phát âm", () => {
    vi.stubGlobal("window", {});
    expect(() => speakText("apple")).not.toThrow();
  });
});

describe("cancelSpeech", () => {
  it("gọi cancel của trình duyệt", () => {
    cancelSpeech();
    expect(synth.cancelCount).toBe(1);
  });

  it("rời trang giữa chừng thì loa im", () => {
    speakText("apple");
    cancelSpeech();
    expect(synth.cancelCount).toBe(2);
  });

  it("không vỡ khi thiết bị không hỗ trợ phát âm", () => {
    vi.stubGlobal("window", {});
    expect(() => cancelSpeech()).not.toThrow();
  });
});
