import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Cần Node thật: thư viện mở WebSocket và làm việc với Buffer
export const runtime = "nodejs";

/**
 * Giọng đọc cho từng ngôn ngữ.
 *
 * Máy Windows thường không có sẵn giọng tiếng Việt, mà đọc được tiếng Việt là
 * yêu cầu bắt buộc — nên tiếng phải do server tạo ra, không phụ thuộc thứ
 * người dùng đã cài. Giọng nữ cho hợp nội dung trẻ em.
 */
const VOICES: Record<string, string> = {
  vi: "vi-VN-HoaiMyNeural",
  en: "en-US-AnaNeural",
  zh: "zh-CN-XiaoyiNeural",
};

/** Chặn người ta biến route này thành dịch vụ đọc văn bản miễn phí */
const MAX_LENGTH = 300;

/**
 * Quá hạn này coi như hỏng. Dịch vụ từng treo 35 giây rồi mới báo lỗi — để
 * nguyên thì trang học đứng chờ, mà chờ xong vẫn không có tiếng.
 */
const TIMEOUT_MS = 12000;

/**
 * Thử lại mấy lần trước khi chịu thua.
 *
 * Đo thực tế: cứ khoảng 8 yêu cầu thì có 1 lần dịch vụ treo rồi hỏng. Thử 3
 * lần thì xác suất hỏng cả ba còn khoảng 1/500 — đủ để trẻ không gặp cảnh
 * bấm vào mà chẳng nghe thấy gì.
 */
const MAX_ATTEMPTS = 3;

async function synthesize(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);

  const chunks: Buffer[] = [];
  const collect = (async () => {
    for await (const chunk of audioStream) chunks.push(chunk as Buffer);
  })();

  await Promise.race([
    collect,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("quá hạn chờ")), TIMEOUT_MS)
    ),
  ]);

  const audio = Buffer.concat(chunks);
  if (audio.length === 0) throw new Error("nhận về 0 byte");
  return audio;
}

/**
 * Trả về file MP3 đọc đoạn văn bản truyền vào.
 *
 * Cùng một câu luôn cho ra cùng một URL nên đặt cache vĩnh viễn: trình duyệt
 * và CDN giữ lại, mỗi câu chỉ thực sự sinh tiếng đúng một lần.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const lang = (searchParams.get("lang") ?? "vi").slice(0, 2).toLowerCase();

  if (!text) {
    return new Response("Thiếu tham số text", { status: 400 });
  }
  if (text.length > MAX_LENGTH) {
    return new Response("Đoạn văn bản quá dài", { status: 413 });
  }

  const voice = VOICES[lang];
  if (!voice) {
    return new Response("Chưa hỗ trợ ngôn ngữ này", { status: 400 });
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const audio = await synthesize(text, voice);
      return new Response(new Uint8Array(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(audio.length),
          // Cùng một câu luôn cùng một địa chỉ nên giữ được vĩnh viễn: mỗi câu
          // chỉ sinh tiếng một lần trên mỗi máy, lần sau lấy từ bộ nhớ đệm
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Nghỉ một nhịp rồi thử lại — dịch vụ vừa từ chối thường do dồn yêu cầu
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }

  // Hỏng cả ba lần: phía client im lặng bỏ qua, chữ vẫn hiện đủ trên màn hình
  return new Response("Không tạo được tiếng", { status: 502 });
}
