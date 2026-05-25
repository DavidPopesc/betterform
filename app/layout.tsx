import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Better Form",
  description: "The form tool that you were looking for.",
  applicationName: "Better Form",
  icons: {
    icon: [
      { url: "/betterformlogo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/betterformlogo.png",
    apple: "/betterformlogo.png",
  },
  appleWebApp: {
    title: "Better Form",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
