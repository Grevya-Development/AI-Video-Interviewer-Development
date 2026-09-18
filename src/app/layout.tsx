import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@livekit/components-styles";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Grevya · AI Interviewer — Intelligent Video Hiring Platform",
  description:
    "Grevya AI Interviewer: AI-assisted video interviews with real-time transcription, intelligent follow-up questions, and structured evaluations.",
  icons: { icon: "/grevya-icon.svg" },
};

import { getCurrentUser } from "@/lib/auth";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-100 selection:text-brand-900">
        <Navbar user={user ? { email: user.email } : null} />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
