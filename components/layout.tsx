import React, { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">{title || "Research Assistant"}</h1>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 bg-gray-100">
        {children}
      </main>
    </div>
  );
}