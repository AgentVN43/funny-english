"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { emailToPhone } from "@/lib/auth";
import { Drawer, Button, Typography, Avatar, Divider, message } from "antd";
import {
  Home,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Shield,
  Layers,
  Newspaper,
  FolderTree,
  LogIn,
  User as UserIcon,
} from "lucide-react";

const { Text } = Typography;

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
  const [profile, setProfile] = useState<{ email: string; role: string } | null>(null);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    message.success("Đã đăng xuất");
    setAuthed(false);
    setProfile(null);
    setOpen(false);
    router.push("/home");
  };

  const navItems: NavItem[] = [
    { label: "Trang chủ", icon: <Home size={20} />, path: "/home" },
    { label: "Tiến độ", icon: <BarChart3 size={20} />, path: "/progress", authOnly: true },
    { label: "Cài đặt", icon: <Settings size={20} />, path: "/settings", authOnly: true },
    { label: "Quản lý Categories", icon: <FolderTree size={20} />, path: "/admin/categories", adminOnly: true },
    { label: "Quản lý Chủ đề", icon: <Layers size={20} />, path: "/admin/topics", adminOnly: true },
    { label: "Quản lý Thẻ", icon: <Newspaper size={20} />, path: "/admin/cards", adminOnly: true },
  ];

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly) return profile?.role === "admin";
    if (item.authOnly) return authed;
    return true;
  });

  if (loading) {
    return <div className="min-h-dvh bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Top bar - mobile app bar; ẩn trên desktop tại /home (trang landing có navbar riêng) */}
      <div
        className={`sticky top-0 z-50 bg-white border-b border-gray-200 ${
          pathname === "/home" ? "lg:hidden" : ""
        }`}
      >
        <div className="w-full max-w-lg lg:max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              icon={<Menu size={24} />}
              onClick={() => setOpen(true)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px]"
            />
            <Text strong className="text-lg">
              Funny English
            </Text>
            {profile?.role === "admin" && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                <Shield size={12} />
                Admin
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {authed ? (
              <>
                {profile?.role === "user" && (
                  <Button
                    type="text"
                    icon={<Settings size={20} />}
                    onClick={() => router.push("/settings")}
                    className="min-w-[44px] min-h-[44px]"
                  />
                )}
                <Avatar
                  size="small"
                  className="bg-indigo-500 cursor-pointer"
                  onClick={() => setOpen(true)}
                >
                  {profile?.email?.[0]?.toUpperCase() || "U"}
                </Avatar>
              </>
            ) : (
              <Button
                type="primary"
                icon={<LogIn size={16} />}
                onClick={() => router.push("/login")}
                className="rounded-xl"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        title={
          authed ? (
            <div className="flex items-center gap-2">
              <Avatar className="bg-indigo-500">
                {profile?.email?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <div>
                <Text strong className="block text-sm">
                  {emailToPhone(profile?.email) || "User"}
                </Text>
                <Text type="secondary" className="text-xs">
                  {profile?.role === "admin" ? "Admin" : "Học viên"}
                </Text>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="bg-gray-300">
                <UserIcon size={16} />
              </Avatar>
              <Text type="secondary" className="text-sm">
                Chưa đăng nhập
              </Text>
            </div>
          )
        }
        placement="left"
        onClose={() => setOpen(false)}
        open={open}
        size="default"
        styles={{ body: { padding: 0 } }}
      >
        <div className="py-2">
          {filteredNav.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                setOpen(false);
                router.push(item.path);
              }}
              className={`w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors min-h-[48px] ${
                pathname === item.path
                  ? "bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          <Divider className="my-2" />
          {authed ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left text-red-500 hover:bg-red-50 transition-colors min-h-[48px]"
            >
              <LogOut size={20} />
              <span className="font-medium">Đăng xuất</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/login");
              }}
              className="w-full flex items-center gap-3 px-6 py-3.5 text-left text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[48px]"
            >
              <LogIn size={20} />
              <span className="font-medium">Đăng nhập</span>
            </button>
          )}
        </div>
      </Drawer>

      {/* Page content - centered via PageContainer in each page */}
      <main className="pb-20">{children}</main>
    </div>
  );
}
