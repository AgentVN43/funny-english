export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pickRandom<T>(array: T[], count: number): T[] {
  return shuffleArray(array).slice(0, count);
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function findVoice(lang: string, gender: "female" | "male"): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  const langPrefix = lang.split("-")[0];
  const candidates = voices.filter(
    (v) => v.lang === lang || v.lang.startsWith(langPrefix)
  );
  const femaleHints = ["female", "zira", "hoai", "hirai", "samantha", "karen", "moira", "tessa", "google"];
  const maleHints = ["male", "mark", "david", "james", "george", "nam", "minh", "daniel", "thomas"];
  const hints = gender === "female" ? femaleHints : maleHints;
  const genderMatch = candidates.find((v) =>
    hints.some((h) => v.name.toLowerCase().includes(h))
  );
  return genderMatch || candidates[0];
}

function makeUtterance(text: string, lang: string, rate: number) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = findVoice(lang, "female");
  if (voice) utterance.voice = voice;
  return utterance;
}

/** Huỷ mọi phát âm đang chờ — gọi khi chuyển thẻ hoặc rời trang */
export function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.speak(makeUtterance(text, lang, 0.9));
}

export function speakVietnamese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.speak(makeUtterance(text, "vi-VN", 1));
}

interface SpeechItem {
  text: string;
  lang?: string;
  rate?: number;
}

/**
 * Hạn chờ tối đa trước khi coi như đã đọc xong (chống treo UI nếu onend không bắn).
 * Scale theo độ dài văn bản vì nội dung có thể là câu dài, không chỉ từ đơn.
 * Ước lượng rất thoáng (~4 ký tự/giây) để không bắn sớm khi TTS vẫn đang đọc.
 */
function watchdogMs(items: SpeechItem[], gapMs: number): number {
  const chars = items.reduce((sum, i) => sum + i.text.length, 0);
  return Math.max(20000, chars * 250 + items.length * gapMs + 5000);
}

/**
 * Đọc lần lượt nhiều câu, chờ câu trước xong mới đọc câu sau.
 * Dùng onend thay vì setTimeout cố định để từ dài không bị cắt hoặc chồng tiếng,
 * và cho phép trộn tiếng Việt (câu khen) với tiếng Anh (từ vựng).
 *
 * `onDone` luôn được gọi đúng một lần — kể cả khi thiết bị không có TTS,
 * trình duyệt chặn phát âm, hoặc utterance lỗi — để UI không bị kẹt.
 */
export function speakSequence(
  items: SpeechItem[],
  opts: { gapMs?: number; onDone?: () => void } = {}
) {
  const { gapMs = 350, onDone } = opts;

  const queue = items.filter((i) => i.text);
  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    queue.length === 0
  ) {
    onDone?.();
    return;
  }

  cancelSpeech();

  let index = 0;
  let finished = false;
  let watchdog: ReturnType<typeof setTimeout>;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    onDone?.();
  };

  watchdog = setTimeout(finish, watchdogMs(queue, gapMs));

  const speakNext = () => {
    const { text, lang = "en-US", rate = 0.9 } = queue[index];
    index += 1;
    const utterance = makeUtterance(text, lang, rate);
    const advance = () => {
      if (index < queue.length) setTimeout(speakNext, gapMs);
      else finish();
    };
    utterance.onend = advance;
    // Trình duyệt lỗi giữa chừng thì vẫn chạy tiếp câu sau
    utterance.onerror = advance;
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

const CORRECT_PHRASES = [
  "Giỏi lắm!",
  "Đúng rồi!",
  "Tuyệt vời!",
  "Làm tốt lắm!",
  "Chính xác!",
  "Đúng rồi, giỏi quá!",
];

const WRONG_PHRASES = [
  "Sai rồi!",
  "Thử lại nhé!",
  "Chưa đúng, cố gắng lên!",
  "Sai một chút thôi!",
];

/** Số lần đọc lại từ vựng sau mỗi câu trả lời */
export const WORD_REPEAT_TIMES = 3;

function pickPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Phản hồi sau khi trả lời: khen/nhắc bằng tiếng Việt rồi đọc to từ vựng
 * tiếng Anh nhiều lần — áp dụng cho cả câu đúng và câu sai.
 *
 * `onDone` được gọi khi đã đọc xong toàn bộ, dùng để mở nút "Tiếp theo".
 */
export function speakFeedback(
  isCorrect: boolean,
  word: string,
  opts: { repeat?: number; onDone?: () => void } = {}
) {
  const { repeat = WORD_REPEAT_TIMES, onDone } = opts;
  const intro = pickPhrase(isCorrect ? CORRECT_PHRASES : WRONG_PHRASES);
  speakSequence(
    [
      { text: intro, lang: "vi-VN", rate: 1 },
      ...Array.from({ length: repeat }, () => ({
        text: word,
        lang: "en-US",
        rate: 0.9,
      })),
    ],
    { onDone }
  );
}
