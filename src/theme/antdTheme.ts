import type { ThemeConfig } from "antd";

/**
 * Token Ant Design khớp với design system trong globals.css.
 *
 * Antd giờ chỉ còn dùng ở khu quản trị và vài tiện ích toàn cục (message,
 * Drawer, Tabs). Đặt token ở đây để không phải override bằng `!important`
 * rải rác trong CSS như bản cũ.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#7c4dff",
    colorSuccess: "#35c759",
    colorError: "#ff4757",
    colorWarning: "#ffc93c",
    colorInfo: "#22b8f0",

    colorText: "#24243e",
    colorTextSecondary: "#6b6e8f",
    colorTextTertiary: "#9ca0bf",
    colorBgLayout: "#f4f7fe",

    borderRadius: 14,
    borderRadiusLG: 20,
    borderRadiusSM: 10,

    fontFamily: "var(--font-nunito), system-ui, sans-serif",
    fontSize: 16,

    controlHeight: 44,
    controlHeightLG: 52,
  },
  components: {
    Button: {
      fontWeight: 700,
      primaryShadow: "none",
    },
    Tabs: {
      titleFontSize: 16,
inkBarColor: "#7c4dff",
    },
    Drawer: {
      paddingLG: 20,
    },
  },
};
