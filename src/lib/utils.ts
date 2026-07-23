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

export function speakText(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  const voice = findVoice(lang, "female");
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function speakVietnamese(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 1;
  const voice = findVoice("vi-VN", "female");
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function speakCorrect() {
  const phrases = [
    "Giỏi lắm!",
    "Đúng rồi!",
    "Tuyệt vời!",
    "Làm tốt lắm!",
    "Chính xác!",
    "Đúng rồi, giỏi quá!",
  ];
  const random = phrases[Math.floor(Math.random() * phrases.length)];
  speakVietnamese(random);
}

export function speakWrong() {
  const phrases = [
    "Sai rồi!",
    "Thử lại nhé!",
    "Chưa đúng, cố gắng lên!",
    "Sai một chút thôi!",
  ];
  const random = phrases[Math.floor(Math.random() * phrases.length)];
  speakVietnamese(random);
}
