import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OrbitOS — OS & Network Visualizer",
  description:
    "Real-time 3D visualization of your OS processes and network traceroutes as an interactive solar system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: "#020408", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
