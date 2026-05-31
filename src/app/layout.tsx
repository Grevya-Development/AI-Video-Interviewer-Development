import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Grevya · Interview IQ — AI Video Interviewer",
  description:
    "Grevya Interview IQ: AI video interviewing with live transcript, AI follow-ups, and structured hiring decisions.",
  icons: { icon: "/grevya-icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
