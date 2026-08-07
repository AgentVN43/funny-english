"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { emailToPhone } from "@/lib/auth";
import { message } from "antd";
import {
  Home,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Layers,
  Newspaper,
  FolderTree,
  LogIn,
  Sparkles,
  Users,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  /** Chỉ hiện khi đã đăng nhập */
  authOnly?: boolean;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Khách chưa đăng nhập vẫn xem được trang chủ — không đẩy ra ngoài
      if (!session) {
        setLoading(false);
        return;
      }
      setAuthed(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        setProfile(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Khoá cuộn nền khi menu mở
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    message.success("Đã đăng xuất");
    setAuthed(false);
    setProfile(null);
    setOpen(false);
    router.push("/home");
  };

  const navItems: NavItem[] = [
    { label: "Trang Chủ", icon: <Home size={22} />, path: "/home" },
    {
      label: "Tiến Độ",
      icon: <BarChart3 size={22} />,
      path: "/progress",
      authOnly: true,
    },
    {
      label: "Cài Đặt",
      icon: <Settings size={22} />,
      path: "/settings",
      authOnly: true,
    },
    {
      label: "Theo Dõi Học Viên",
      icon: <Users size={22} />,
      path: "/admin/students",
      adminOnly: true,
    },
    {
      label: "Quản Lý Danh Mục",
      icon: <FolderTree size={22} />,
      path: "/admin/categories",
      adminOnly: true,
    },
    {
      label: "Quản Lý Chủ Đề",
      icon: <Layers size={22} />,
      path: "/admin/topics",
      adminOnly: true,
    },
    {
      label: "Quản Lý Thẻ",
      icon: <Newspaper size={22} />,
      path: "/admin/cards",
      adminOnly: true,
    },
  ];

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly) return profile?.role === "admin";
    if (item.authOnly) return authed;
    return true;
  });

  const isAdmin = profile?.role === "admin";

  if (loading) return <div className="min-h-dvh bg-cloud">{children}</div>;

  // Trang học chiếm trọn màn hình, không cần thanh trên
  const isLearnPage = pathname?.startsWith("/learn/");

  return (
    <div className="min-h-dvh bg-cloud">
      {!isLearnPage && (
        <header className="sticky top-0 z-40 border-b-2 border-cloud-deep bg-white">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2.5 lg:max-w-6xl">
            <button
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
              className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-cloud"
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>

            <button
              onClick={() => router.push("/home")}
              className="flex min-w-0 items-center gap-2"
            >
              <span className="text-2xl" aria-hidden>
                🦉
              </span>
              <span className="truncate font-display text-lg font-extrabold text-ink">
                Funny English
              </span>
              {isAdmin && (
                <span className="hidden items-center gap-1 rounded-full bg-grape-soft px-2 py-0.5 text-xs font-extrabold text-grape sm:inline-flex">
                  <Shield size={11} />
                  Admin
                </span>
              )}
            </button>

            {authed ? (
              <button
                onClick={() => setOpen(true)}
                aria-label="Tài khoản"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-grape font-display text-lg font-extrabold text-white"
              >
                {emailToPhone(profile?.email)?.[0]?.toUpperCase() ?? "U"}
              </button>
            ) : (
              <Button
                size="md"
                icon={<LogIn size={18} strokeWidth={2.5} />}
                onClick={() => router.push("/login")}
              >
                Vào học
              </Button>
            )}
          </div>
        </header>
      )}

      {/* Menu trượt */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />

          <nav className="anim-slide-in relative flex h-full w-[86%] max-w-xs flex-col bg-white shadow-2xl">
            {/* Đầu menu */}
            <div className="flex items-start justify-between gap-2 bg-grape p-4 pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20 text-2xl"
                  aria-hidden
                >
                  {authed ? "🧒" : "👋"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-extrabold text-white">
                    {authed
                      ? emailToPhone(profile?.email) || "Bạn nhỏ"
                      : "Xin chào!"}
                  </p>
                  <p className="text-sm font-bold text-white/80">
                    {authed
                      ? isAdmin
                        ? "Quản trị viên"
                        : "Học viên"
                      : "Chưa đăng nhập"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/20"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Danh sách mục */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredNav.map((item) => {
                const active = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setOpen(false);
                      router.push(item.path);
                    }}
                    className={`mb-1 flex w-full items-center gap-3 rounded-pill px-4 py-3 text-left font-display font-extrabold transition-colors ${
                      active
                        ? "bg-grape-soft text-grape"
                        : "text-ink hover:bg-cloud"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chân menu */}
            <div className="border-t-2 border-cloud-deep p-3">
              {authed ? (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-pill px-4 py-3 text-left font-display font-extrabold text-cherry transition-colors hover:bg-cherry-soft"
                >
                  <LogOut size={22} />
                  Đăng xuất
                </button>
              ) : (
                <Button
                  block
                  icon={<Sparkles size={18} strokeWidth={2.5} />}
                  onClick={() => {
                    setOpen(false);
                    router.push("/login");
                  }}
                >
                  Bắt đầu học
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}

      <main className={isLearnPage ? "" : "pb-16"}>{children}</main>
    </div>
  );
}
