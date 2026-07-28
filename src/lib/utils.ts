export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Danh sách giọng đọc lần cuối lấy được.
 *
 * `getVoices()` của trình duyệt trả mảng rỗng cho tới khi nạp xong giọng, và
 * thỉnh thoảng rỗng lại giữa chừng. Giữ bản chép gần nhất để một lần rỗng
 * không làm mất giọng đã tìm được.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];
/** Bản chép thuộc về đúng bộ đọc nào — đổi bộ đọc thì bản chép cũ vô nghĩa */
let cachedFrom: SpeechSynthesis | null = null;

/** Chờ giọng tối đa bấy nhiêu mili giây trước khi đọc bằng giọng đang có */
const VOICE_WAIT_MS = 1000;

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const synth = window.speechSynthesis;
  if (synth !== cachedFrom) {
    cachedFrom = synth;
    cachedVoices = [];
  }
  const voices = synth.getVoices();
  if (voices.length > 0) cachedVoices = voices;
  return cachedVoices;
}

/**
 * Chạy `run` khi trình duyệt đã có danh sách giọng.
 *
 * Chrome nạp giọng bất đồng bộ: mở trang xong gọi ngay `getVoices()` thường
 * được mảng rỗng, phải đợi sự kiện `voiceschanged`. Đọc trong lúc đó thì
 * không tìm thấy giọng tiếng Việt nào và câu hỏi bị đọc bằng giọng mặc định
 * — tức giọng tiếng Anh đánh vần chữ Việt.
 *
 * Trình duyệt không có `addEventListener` trên speechSynthesis thì coi như
 * danh sách đã sẵn sàng, chờ nữa cũng không có gì để chờ.
 */
function whenVoicesReady(run: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  if (getVoices().length > 0 || typeof synth.addEventListener !== "function") {
    run();
    return;
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    synth.removeEventListener?.("voiceschanged", start);
    run();
  };

  synth.addEventListener("voiceschanged", start);
  // Có máy không bắn voiceschanged bao giờ — chờ tối đa 1 giây rồi đọc đại
  setTimeout(start, VOICE_WAIT_MS);
}

/** Ưu tiên giọng nữ cho hợp nội dung trẻ em, không có thì lấy giọng đầu tiên đúng ngôn ngữ */
function findVoice(lang: string): SpeechSynthesisVoice | undefined {
  const langPrefix = lang.split("-")[0];
  const voices = getVoices();
  // Khớp đúng mã vùng trước (vi-VN), sau mới tới cùng ngôn ngữ khác vùng
  const candidates = [
    ...voices.filter((v) => v.lang.replace("_", "-") === lang),
    ...voices.filter(
      (v) =>
        v.lang.replace("_", "-") !== lang &&
        v.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
    ),
  ];
  const femaleHints = [
    "female",
    "zira",
    "samantha",
    "karen",
    "moira",
    "tessa",
    "google",
    "hoaimy", // giọng nữ tiếng Việt của Windows
  ];
  const femaleMatch = candidates.find((v) =>
    femaleHints.some((h) => v.name.toLowerCase().includes(h))
  );
  return femaleMatch || candidates[0];
}

/** Máy này có giọng đọc cho ngôn ngữ đó không */
export function hasVoiceFor(lang: string): boolean {
  return findVoice(lang) !== undefined;
}

/**
 * Số hiệu lượt đọc hiện tại, tăng mỗi khi huỷ hoặc bắt đầu lượt mới.
 *
 * Cần thiết vì `speechSynthesis.cancel()` làm trình duyệt bắn `end` cho câu
 * đang đọc — mà đó chính là tín hiệu "đọc lượt tiếp theo". Không có số hiệu
 * này thì huỷ xong loa vẫn đọc nốt các lượt còn lại, kể cả sau khi đã sang thẻ
 * khác hoặc rời trang học.
 */
let speechGeneration = 0;

/** Huỷ phát âm đang chạy — gọi khi chuyển thẻ hoặc rời trang học */
export function cancelSpeech() {
  speechGeneration++;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

function makeUtterance(
  text: string,
  lang: string,
  rate: number,
  voice?: SpeechSynthesisVoice
) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  if (voice) utterance.voice = voice;
  return utterance;
}

/**
 * Đọc một đoạn lặp lại nhiều lần, lượt sau chờ lượt trước đọc xong.
 *
 * Nối lượt bằng `onend` chứ không phải hẹn giờ cố định: câu giao tiếp dài ngắn
 * rất khác nhau, hẹn giờ thì hoặc cắt ngang hoặc để loa im một quãng.
 * `onerror` cũng nối tiếp — thiết bị bắn lỗi giữa chừng thì các lượt sau vẫn
 * chạy thay vì đứng im.
 *
 * Huỷ phần đang đọc dở trước đã: trả lời nhanh hai câu liên tiếp mà không huỷ
 * thì trình duyệt xếp hàng và đọc chồng từ của câu trước lên câu sau.
 */
export function speakTimes(
  text: string,
  opts: { times?: number; lang?: string; rate?: number; gapMs?: number } = {}
) {
  const { times = 1, lang = "en-US", rate = 0.9, gapMs = 250 } = opts;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!text.trim() || times < 1) return;

  cancelSpeech();
  const generation = speechGeneration;

  whenVoicesReady(() => {
    // Lượt đọc đã bị huỷ hoặc bị lượt mới thay thế trong lúc chờ giọng
    if (generation !== speechGeneration) return;

    const voice = findVoice(lang);
    // Máy có giọng nhưng không có giọng nào cho ngôn ngữ này thì thôi không
    // đọc. Không đặt `voice` là trình duyệt lấy giọng mặc định — thường là
    // tiếng Anh — rồi đánh vần chữ tiếng Việt thành một thứ tiếng không ai
    // hiểu. Chữ vẫn hiện đủ trên màn hình nên im lặng còn hơn.
    if (!voice && getVoices().length > 0) return;

    let remaining = times;
    const speakOnce = () => {
      if (generation !== speechGeneration) return;

      remaining--;
      const utterance = makeUtterance(text, lang, rate, voice);
      if (remaining > 0) {
        const next = () => {
          if (generation !== speechGeneration) return;
          setTimeout(speakOnce, gapMs);
        };
        utterance.onend = next;
        utterance.onerror = next;
      }
      window.speechSynthesis.speak(utterance);
    };

    speakOnce();
  });
}

/** Đọc to một đoạn đúng một lần */
export function speakText(text: string, lang = "en-US") {
  speakTimes(text, { lang });
}
