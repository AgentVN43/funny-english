# Funny English

Web học từ vựng tiếng Anh cho trẻ em. Next.js 16 App Router + React 19, Tailwind 4, Supabase (auth + Postgres + RLS). Ant Design chỉ còn dùng trong khu admin.

## Giao diện

**Đọc [design-system.md](design-system.md) trước khi viết bất kỳ UI nào.** Đó là tài liệu chuẩn cho toàn hệ thống: token, ngữ nghĩa màu, component và luật dùng.

Vài ràng buộc không được vi phạm, tóm tắt ở đây để khỏi bỏ sót:

- **Không hex thô, không class Tailwind mặc định** (`bg-blue-500`, `text-gray-600`, `rounded-lg`). Chỉ dùng token của dự án khai báo trong [src/app/globals.css](src/app/globals.css) — đó là nguồn sự thật duy nhất của giá trị.
- **Màu nhấn có nghĩa cố định**: `leaf` = đúng, `cherry` = sai, `sun` = thưởng. Không dùng lẫn.
- **Dùng lại component** trong [src/components/ui/](src/components/ui/) (`Button`, `Card`, `OptionButton`, `ProgressBar`, `StatTile`, `Screen`, `Loader`, `Skeleton`, `EmptyState`). Cần biến thể mới thì thêm `tone`/`size` vào component sẵn có, không tạo file song song. Không viết `<button>` trần.
- **Mobile-first**, vùng bấm tối thiểu 48px.
- **Tiếng Việt** cho mọi chữ hiển thị và comment.

Cần nhìn bằng mắt thì mở [design-system.html](design-system.html) ở gốc repo — file tĩnh, không phải route nên người dùng không truy cập được. Nó chép token từ `globals.css`, nên **sửa token thì cập nhật file HTML trong cùng commit**, nếu không bảng tra sẽ nói sai.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm test
```
