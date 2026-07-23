"use client";

export function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full max-w-lg mx-auto px-4 ${className}`}>
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
