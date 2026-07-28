export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/** Ưu tiên giọng nữ cho hợp nội dung trẻ em, không có thì lấy giọng đầu tiên đúng ngôn ngữ */
function findVoice(lang: string): SpeechSynthesisVoice | undefined {
  const langPrefix = lang.split("-")[0];
  const candidates = getVoices().filter(
    (v) => v.lang === lang || v.lang.startsWith(langPrefix)
  );
  const femaleHints = [
    "female",
    "zira",
    "samantha",
    "karen",
    "moira",
    "tessa",
    "google",
  ];
  const femaleMatch = candidates.find((v) =>
    femaleHints.some((h) => v.name.toLowerCase().includes(h))
  );
  return femaleMatch || candidates[0];
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

function makeUtterance(text: string, lang: string, rate: number) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice = findVoice(lang);
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

  let remaining = times;
  const speakOnce = () => {
    // Lượt đọc đã bị huỷ hoặc bị lượt mới thay thế
    if (generation !== speechGeneration) return;

    remaining--;
    const utterance = makeUtterance(text, lang, rate);
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
}

/** Đọc to một đoạn đúng một lần */
export function speakText(text: string, lang = "en-US") {
  speakTimes(text, { lang });
}
