import { supabase } from "./supabase";

// Số điện thoại chỉ là chuỗi định danh — không dùng SMS/OTP.
// Map SĐT sang email ảo nội bộ để dùng email/password auth của Supabase.
const PHONE_EMAIL_DOMAIN = "funnylearn.local";

export const DEFAULT_PASSWORD = "11111111";

export function isValidPhone(phone: string): boolean {
  return /^0\d{8,10}$/.test(phone.trim());
}

export function phoneToEmail(phone: string): string {
  return `${phone.trim()}@${PHONE_EMAIL_DOMAIN}`;
}

/** Hiển thị SĐT từ email ảo; email thật (admin) giữ nguyên */
export function emailToPhone(email?: string | null): string {
  if (!email) return "";
  if (email.endsWith(`@${PHONE_EMAIL_DOMAIN}`)) {
    return email.split("@")[0];
  }
  return email;
}

/** Input là SĐT hoặc email thật (tài khoản admin cũ) */
function toAuthEmail(identifier: string): string {
  const id = identifier.trim();
  return id.includes("@") ? id : phoneToEmail(id);
}

export async function loginWithPhone(identifier: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: toAuthEmail(identifier),
    password,
  });
}

/** Đăng ký bằng SĐT, password mặc định 11111111 */
export async function registerWithPhone(phone: string) {
  return supabase.auth.signUp({
    email: phoneToEmail(phone),
    password: DEFAULT_PASSWORD,
  });
}

export async function changePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}
