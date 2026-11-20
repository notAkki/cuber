import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuber · 3×3 Cube Timer",
  description: "A focused speedcubing timer with random-state scrambles and solve review.",
  icons: { icon: { url: "/cuber.svg", type: "image/svg+xml" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>{`
          try {
            const { theme, accent } = JSON.parse(localStorage.getItem("turnform.preferences.v1")) ?? {};
            if (typeof accent === "string") document.documentElement.dataset.accent = accent;
            if (theme === "dark" || theme === "ink") document.documentElement.dataset.theme = "dark";
          } catch {}
        `}</script>
      </head>
      <body>{children}</body>
    </html>
  );
}
