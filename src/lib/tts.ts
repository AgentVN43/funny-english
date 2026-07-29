/**
 * Địa chỉ file tiếng do server đọc.
 *
 * Cùng một câu luôn cho ra cùng một địa chỉ, và route trả về kèm cache vĩnh
 * viễn — nên mỗi câu chỉ thực sự được sinh tiếng một lần trên mỗi máy, những
 * lần sau trình duyệt lấy lại từ bộ nhớ đệm.
 */
export function ttsUrl(text: string, lang: string): string {
  const params = new URLSearchParams({ lang: lang.slice(0, 2), text });
  return `/api/tts?${params.toString()}`;
}
