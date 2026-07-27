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

/** Huỷ phát âm đang chạy — gọi khi chuyển thẻ hoặc rời trang học */
export function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * Đọc to một từ, đúng một lần.
 *
 * Huỷ phần đang đọc dở trước đã: trả lời nhanh hai câu liên tiếp mà không huỷ
 * thì trình duyệt xếp hàng và đọc chồng từ của câu trước lên câu sau.
 */
export function speakText(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!text.trim()) return;

  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  const voice = findVoice(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
