"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { supabase } from "./supabase";

/**
 * Chặn cửa trang admin: chưa đăng nhập thì đẩy ra trang đăng nhập, đăng nhập
 * rồi mà không phải admin thì đẩy về trang chủ.
 *
 * Trả về `false` cho tới khi xác thực xong, nên trang gọi phải chờ trước khi
 * tải dữ liệu — tránh chớp nội dung quản trị cho người không có quyền.
 */
export function useAdminGuard(): boolean {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?admin=true");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.role !== "admin") {
        message.error("Bạn không có quyền admin");
        router.replace("/home");
        return;
      }
      setAllowed(true);
    })();
  }, [router]);

  return allowed;
}
