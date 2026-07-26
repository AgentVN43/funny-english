import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WORD_REPEAT_TIMES,
  cancelSpeech,
  shuffleArray,
  speakFeedback,
  speakSequence,
  speakText,
} from "./utils";

/** Cách trình duyệt giả lập kết thúc một lượt đọc */
type SpeechBehaviour = "end" | "error" | "silent";

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

class FakeSpeechSynthesis {
  spoken: FakeUtterance[] = [];
  cancelCount = 0;
  behaviour: SpeechBehaviour = "end";

  getVoices() {
    return [];
  }

  cancel() {
    this.cancelCount++;
  }

  speak(u: FakeUtterance) {
    this.spoken.push(u);
    if (this.behaviour === "silent") return; // TTS im lặng, không bắn sự kiện
    setTimeout(() => {
      if (this.behaviour === "error") u.onerror?.();
      else u.onend?.();
    }, 10);
  }
}

let synth: FakeSpeechSynthesis;

beforeEach(() => {
  vi.useFakeTimers();
  synth = new FakeSpeechSynthesis();
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("shuffleArray", () => {
  it("không sửa mảng gốc", () => {
    const original = [1, 2, 3, 4, 5];
    shuffleArray(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  it("giữ nguyên đủ các phần tử", () => {
    const result = shuffleArray([1, 2, 3, 4, 5]);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("mảng rỗng và mảng một phần tử vẫn chạy", () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([9])).toEqual([9]);
  });
});

describe("speakSequence", () => {
  it("đọc lần lượt, xong câu trước mới sang câu sau", () => {
    const onDone = vi.fn();
    speakSequence(
      [
        { text: "một", lang: "vi-VN" },
        { text: "two", lang: "en-US" },
      ],
      { onDone }
    );

    // Chưa chạy timer thì mới đọc câu đầu
    expect(synth.spoken.map((u) => u.text)).toEqual(["một"]);
    expect(onDone).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(synth.spoken.map((u) => u.text)).toEqual(["một", "two"]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("đặt đúng ngôn ngữ cho từng câu", () => {
    speakSequence([
      { text: "Giỏi lắm!", lang: "vi-VN" },
      { text: "apple", lang: "en-US" },
    ]);
    vi.runAllTimers();
    expect(synth.spoken.map((u) => u.lang)).toEqual(["vi-VN", "en-US"]);
  });

  it("huỷ phần đang đọc dở trước khi bắt đầu lượt mới", () => {
    speakSequence([{ text: "a" }]);
    expect(synth.cancelCount).toBe(1);
  });

  it("onDone vẫn chạy khi trình duyệt báo lỗi giữa chừng", () => {
    synth.behaviour = "error";
    const onDone = vi.fn();
    speakSequence([{ text: "a" }, { text: "b" }], { onDone });
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(2);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("onDone vẫn chạy khi TTS im lặng — nhờ watchdog", () => {
    synth.behaviour = "silent";
    const onDone = vi.fn();
    speakSequence([{ text: "apple" }], { onDone });

    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(19_000);
    expect(onDone).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000); // watchdog tối thiểu 20 giây
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("onDone chỉ chạy đúng một lần dù watchdog và onend cùng bắn", () => {
    const onDone = vi.fn();
    speakSequence([{ text: "a" }], { onDone });
    vi.runAllTimers();
    vi.advanceTimersByTime(60_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("onDone chạy ngay khi thiết bị không hỗ trợ phát âm", () => {
    vi.stubGlobal("window", {});
    const onDone = vi.fn();
    speakSequence([{ text: "a" }], { onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("onDone chạy ngay khi danh sách rỗng", () => {
    const onDone = vi.fn();
    speakSequence([], { onDone });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(synth.spoken).toHaveLength(0);
  });

  it("bỏ qua các câu rỗng", () => {
    const onDone = vi.fn();
    speakSequence([{ text: "" }, { text: "apple" }, { text: "" }], { onDone });
    vi.runAllTimers();
    expect(synth.spoken.map((u) => u.text)).toEqual(["apple"]);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("gọi được mà không truyền onDone", () => {
    expect(() => {
      speakSequence([{ text: "a" }]);
      vi.runAllTimers();
    }).not.toThrow();
  });
});

describe("speakFeedback", () => {
  it("đọc một câu tiếng Việt rồi đọc từ vựng 3 lần", () => {
    const onDone = vi.fn();
    speakFeedback(true, "apple", { onDone });
    vi.runAllTimers();

    expect(synth.spoken).toHaveLength(1 + WORD_REPEAT_TIMES);
    const [intro, ...words] = synth.spoken;
    expect(intro.lang).toBe("vi-VN");
    expect(words.map((u) => u.text)).toEqual(["apple", "apple", "apple"]);
    expect(words.every((u) => u.lang === "en-US")).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("câu trả lời sai cũng được đọc lại từ vựng", () => {
    speakFeedback(false, "banana");
    vi.runAllTimers();
    const words = synth.spoken.slice(1);
    expect(words.map((u) => u.text)).toEqual([
      "banana",
      "banana",
      "banana",
    ]);
  });

  it("số lần đọc lại chỉnh được", () => {
    speakFeedback(true, "cat", { repeat: 1 });
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(2);
  });

  it("mở khoá nút Tiếp theo cả khi TTS im lặng", () => {
    synth.behaviour = "silent";
    const onDone = vi.fn();
    speakFeedback(true, "elephant", { onDone });
    vi.advanceTimersByTime(60_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("cancelSpeech", () => {
  it("gọi cancel của trình duyệt", () => {
    cancelSpeech();
    expect(synth.cancelCount).toBe(1);
  });

  it("không vỡ khi thiết bị không hỗ trợ phát âm", () => {
    vi.stubGlobal("window", {});
    expect(() => cancelSpeech()).not.toThrow();
  });

  it("bấm Bỏ qua thì phần đọc còn lại không phát nữa", () => {
    speakFeedback(true, "apple");
    expect(synth.spoken).toHaveLength(1); // mới đọc câu khen

    // Đang đọc dở thì người dùng bấm Bỏ qua
    cancelSpeech();
    vi.runAllTimers();

    // Trình duyệt bắn end/error cho câu bị huỷ — không được dựa vào đó
    // để đọc tiếp 3 lượt từ vựng còn lại
    expect(synth.spoken).toHaveLength(1);
  });

  it("huỷ giữa chừng không gọi onDone — tránh mở khoá nhầm cho thẻ sau", () => {
    const onDone = vi.fn();
    speakFeedback(true, "apple", { onDone });
    cancelSpeech();
    vi.advanceTimersByTime(120_000); // qua cả hạn watchdog
    expect(onDone).not.toHaveBeenCalled();
  });

  it("rời trang giữa chừng thì loa im, không đọc nốt các từ còn lại", () => {
    speakFeedback(false, "banana");
    cancelSpeech(); // cleanup của useEffect khi unmount
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(1);
  });

  it("lượt đọc mới thay thế hoàn toàn lượt cũ", () => {
    speakSequence([{ text: "cũ-1" }, { text: "cũ-2" }, { text: "cũ-3" }]);
    speakSequence([{ text: "mới-1" }, { text: "mới-2" }]);
    vi.runAllTimers();

    const texts = synth.spoken.map((u) => u.text);
    expect(texts).toEqual(["cũ-1", "mới-1", "mới-2"]);
  });

  it("onDone của lượt cũ không chạy khi bị lượt mới thay thế", () => {
    const oldDone = vi.fn();
    const newDone = vi.fn();
    speakSequence([{ text: "a" }, { text: "b" }], { onDone: oldDone });
    speakSequence([{ text: "c" }], { onDone: newDone });
    vi.runAllTimers();

    expect(oldDone).not.toHaveBeenCalled();
    expect(newDone).toHaveBeenCalledTimes(1);
  });
});

describe("speakText", () => {
  it("đọc bằng giọng tiếng Anh", () => {
    speakText("apple");
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].lang).toBe("en-US");
  });

  it("không vỡ khi thiết bị không hỗ trợ phát âm", () => {
    vi.stubGlobal("window", {});
    expect(() => speakText("apple")).not.toThrow();
  });
});
