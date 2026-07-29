import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSpeech,
  hasVoiceFor,
  shuffleArray,
  speakText,
  speakTimes,
} from "./utils";

class FakeUtterance {
  lang = "";
  rate = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

/**
 * Bộ đọc đã nạp xong giọng: không có `addEventListener` nên code coi danh
 * sách là sẵn sàng và đọc ngay.
 */
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

/** Bộ đọc nạp giọng chậm, giống Chrome: có sự kiện voiceschanged */
class FakeLazySpeechSynthesis extends FakeSpeechSynthesis {
  private listeners: (() => void)[] = [];

  addEventListener(_type: string, fn: () => void) {
    this.listeners.push(fn);
  }

  removeEventListener(_type: string, fn: () => void) {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  /** Trình duyệt nạp xong giọng */
  loadVoices(voices: { name: string; lang: string }[]) {
    this.voices = voices;
    for (const fn of [...this.listeners]) fn();
  }
}

/** Thẻ <audio> giả — dùng cho tiếng do server đọc */
class FakeAudio {
  static created: FakeAudio[] = [];
  onended: (() => void) | null = null;
  paused = false;
  playCount = 0;

  constructor(public src: string) {
    FakeAudio.created.push(this);
  }

  play() {
    this.playCount++;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

let synth: FakeSpeechSynthesis;

beforeEach(() => {
  synth = new FakeSpeechSynthesis();
  // Máy đủ giọng cho cả hai ngôn ngữ — trường hợp thường. Test nào cần máy
  // thiếu giọng thì tự đặt lại danh sách này.
  synth.voices = [
    { name: "Microsoft Zira", lang: "en-US" },
    { name: "Microsoft HoaiMy - Vietnamese", lang: "vi-VN" },
  ];
  FakeAudio.created = [];
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("Audio", FakeAudio);
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

describe("speakTimes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Giả lập trình duyệt đọc xong câu vừa phát */
  const finishSpeaking = () => {
    const last = synth.spoken[synth.spoken.length - 1];
    last?.onend?.();
    vi.runAllTimers();
  };

  it("chỉ đọc lượt đầu, chờ đọc xong mới đọc lượt sau", () => {
    speakTimes("apple", { times: 3 });
    expect(synth.spoken).toHaveLength(1);

    finishSpeaking();
    expect(synth.spoken).toHaveLength(2);

    finishSpeaking();
    expect(synth.spoken.map((u) => u.text)).toEqual([
      "apple",
      "apple",
      "apple",
    ]);
  });

  it("đọc đủ số lượt rồi dừng hẳn", () => {
    speakTimes("apple", { times: 2 });
    finishSpeaking();
    // Lượt cuối không gắn onend nên không có gì để nối tiếp
    expect(synth.spoken[1].onend).toBeNull();
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(2);
  });

  it("huỷ giữa chừng thì các lượt còn lại im", () => {
    speakTimes("apple", { times: 3 });
    const first = synth.spoken[0];
    cancelSpeech();
    first.onend?.();
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(1);
  });

  it("lượt đọc mới thay thế lượt cũ, không đọc chồng", () => {
    speakTimes("apple", { times: 3 });
    const first = synth.spoken[0];
    speakTimes("banana", { times: 1 });
    first.onend?.();
    vi.runAllTimers();
    expect(synth.spoken.map((u) => u.text)).toEqual(["apple", "banana"]);
  });

  it("thiết bị bắn lỗi giữa chừng vẫn đọc nốt các lượt sau", () => {
    speakTimes("apple", { times: 2 });
    synth.spoken[0].onerror?.();
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(2);
  });

  it("số lượt không hợp lệ thì không đọc gì", () => {
    speakTimes("apple", { times: 0 });
    vi.runAllTimers();
    expect(synth.spoken).toHaveLength(0);
  });
});

describe("chọn giọng theo ngôn ngữ", () => {
  const VI = { name: "Microsoft HoaiMy - Vietnamese", lang: "vi-VN" };
  const EN = { name: "Microsoft Zira", lang: "en-US" };

  it("đọc tiếng Việt bằng giọng tiếng Việt, không phải giọng mặc định", () => {
    synth.voices = [EN, VI];
    speakText("Tên tiếng Anh của con chó là gì?", "vi-VN");
    expect((synth.spoken[0].voice as { name: string }).name).toBe(VI.name);
  });

  it("máy không có giọng tiếng Việt thì nhờ server đọc", () => {
    // Không đặt voice là trình duyệt lấy giọng mặc định đánh vần chữ Việt —
    // nghe ra một thứ tiếng lạ. Máy Windows không có giọng tiếng Việt, cả
    // Chrome lẫn Edge, nên đây là đường chạy thật của phần lớn người dùng.
    synth.voices = [EN];
    speakText("Tên tiếng Anh của con chó là gì?", "vi-VN");

    expect(synth.spoken).toHaveLength(0);
    expect(FakeAudio.created).toHaveLength(1);
    expect(FakeAudio.created[0].src).toContain("/api/tts");
    expect(FakeAudio.created[0].src).toContain("lang=vi");
    expect(FakeAudio.created[0].playCount).toBe(1);
  });

  it("vẫn đọc tiếng Anh bằng giọng của máy, không gọi server vô ích", () => {
    synth.voices = [EN];
    speakText("dog");
    expect(synth.spoken).toHaveLength(1);
    expect(FakeAudio.created).toHaveLength(0);
  });

  it("máy không có giọng nào thì cũng nhờ server đọc", () => {
    synth.voices = [];
    speakText("xin chào", "vi-VN");
    expect(FakeAudio.created).toHaveLength(1);
  });

  it("giọng đúng mã vùng được ưu tiên hơn giọng cùng ngôn ngữ khác vùng", () => {
    const enGb = { name: "Microsoft Hazel", lang: "en-GB" };
    synth.voices = [enGb, EN];
    speakText("dog", "en-US");
    expect((synth.spoken[0].voice as { name: string }).name).toBe(EN.name);
  });

  it("hasVoiceFor cho biết máy có đọc được ngôn ngữ đó không", () => {
    synth.voices = [EN];
    expect(hasVoiceFor("en-US")).toBe(true);
    expect(hasVoiceFor("vi-VN")).toBe(false);
  });
});

describe("tiếng do server đọc", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Máy chỉ có giọng tiếng Anh — đúng tình huống máy Windows thật
    synth.voices = [{ name: "Microsoft Zira", lang: "en-US" }];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("phát đủ số lượt, lượt sau chờ lượt trước xong", () => {
    speakTimes("Câu hỏi tiếng Việt", { times: 3, lang: "vi-VN" });
    expect(FakeAudio.created).toHaveLength(1);

    FakeAudio.created[0].onended?.();
    vi.runAllTimers();
    expect(FakeAudio.created).toHaveLength(2);

    FakeAudio.created[1].onended?.();
    vi.runAllTimers();
    expect(FakeAudio.created).toHaveLength(3);
    // Lượt cuối không nối tiếp nữa
    expect(FakeAudio.created[2].onended).toBeNull();
  });

  it("cả ba lượt dùng lại đúng một địa chỉ nên chỉ tải một lần", () => {
    speakTimes("Câu hỏi tiếng Việt", { times: 3, lang: "vi-VN" });
    FakeAudio.created[0].onended?.();
    vi.runAllTimers();
    expect(FakeAudio.created[1].src).toBe(FakeAudio.created[0].src);
  });

  it("bấm tiếp giữa chừng thì tắt tiếng ngay và bỏ các lượt còn lại", () => {
    speakTimes("Câu hỏi tiếng Việt", { times: 3, lang: "vi-VN" });
    const first = FakeAudio.created[0];

    cancelSpeech();
    expect(first.paused).toBe(true);

    first.onended?.();
    vi.runAllTimers();
    expect(FakeAudio.created).toHaveLength(1);
  });

  it("đưa nguyên câu vào địa chỉ để server đọc đúng chữ đó", () => {
    speakText("Tên tiếng Anh của con chó là gì?", "vi-VN");
    // URLSearchParams mã hoá khoảng trắng thành dấu cộng, server giải mã lại đúng
    const src = decodeURIComponent(FakeAudio.created[0].src).replace(/\+/g, " ");
    expect(src).toContain("Tên tiếng Anh của con chó là gì?");
  });

  it("hai câu khác nhau cho ra hai địa chỉ khác nhau", () => {
    speakText("Câu một", "vi-VN");
    speakText("Câu hai", "vi-VN");
    expect(FakeAudio.created[1].src).not.toBe(FakeAudio.created[0].src);
  });
});

describe("chờ trình duyệt nạp giọng", () => {
  let lazy: FakeLazySpeechSynthesis;

  beforeEach(() => {
    vi.useFakeTimers();
    lazy = new FakeLazySpeechSynthesis();
    vi.stubGlobal("window", { speechSynthesis: lazy });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chưa có giọng nào thì chờ, không đọc vội bằng giọng mặc định", () => {
    speakText("Tên tiếng Anh của con chó là gì?", "vi-VN");
    expect(lazy.spoken).toHaveLength(0);
  });

  it("nạp giọng xong mới đọc, và đọc đúng giọng tiếng Việt", () => {
    speakText("Tên tiếng Anh của con chó là gì?", "vi-VN");
    lazy.loadVoices([
      { name: "Microsoft Zira", lang: "en-US" },
      { name: "Microsoft HoaiMy - Vietnamese", lang: "vi-VN" },
    ]);
    expect(lazy.spoken).toHaveLength(1);
    expect((lazy.spoken[0].voice as { name: string }).name).toBe(
      "Microsoft HoaiMy - Vietnamese"
    );
  });

  it("máy không bao giờ báo nạp xong thì sau một giây vẫn đọc", () => {
    speakText("dog");
    vi.advanceTimersByTime(1000);
    // Hết hạn chờ mà vẫn không thấy giọng nào thì nhờ server đọc
    expect(FakeAudio.created).toHaveLength(1);
  });

  it("chuyển thẻ trong lúc chờ thì bỏ luôn lượt đọc cũ", () => {
    speakText("câu hỏi cũ", "vi-VN");
    cancelSpeech();
    lazy.loadVoices([{ name: "Google Tiếng Việt", lang: "vi-VN" }]);
    expect(lazy.spoken).toHaveLength(0);
  });

  it("nạp xong rồi thì lượt sau đọc ngay, không chờ nữa", () => {
    lazy.loadVoices([{ name: "Google Tiếng Việt", lang: "vi-VN" }]);
    speakText("xin chào", "vi-VN");
    expect(lazy.spoken).toHaveLength(1);
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
