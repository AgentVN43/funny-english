"use client";

export function PageContainer({
  children,
  className = "",
  wide = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Trang landing desktop: mở rộng max-width trên màn hình lớn */
  wide?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`w-full mx-auto px-4 ${
        wide ? "max-w-lg lg:max-w-6xl" : "max-w-lg"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function FullScreenCenter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center min-h-dvh bg-gradient-to-br from-indigo-500 to-purple-600 p-4 ${className}`}
    >
      {children}
    </div>
  );
}
