import { redirect } from "next/navigation";

/** Vào web là thấy ngay danh sách chủ đề — không cần đăng nhập */
export default function RootPage() {
  redirect("/home");
}
