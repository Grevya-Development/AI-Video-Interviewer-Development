"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  LogIn,
} from "lucide-react";

interface NavbarProps {
  user: { email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Scroll detection: sticky full-width at top-0 vs floating stadium pill on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  // State management
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // References for click-outside detection
  const profileRef = useRef<HTMLDivElement>(null);

  // Instant SPA sign out: clears session immediately and uses React DOM router
  // with zero full-page reload and zero performance lag
  const handleSignOut = async () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      fetch("/auth/signout", { method: "POST" }).catch(() => { });
    } catch { }
    router.replace("/login");
    router.refresh();
  };

  // Detect window scroll position to dynamically adapt navbar styling
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolled(scrollPos > 15);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on route changes
  useEffect(() => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide navbar on candidate interview screen (/join/[token])
  if (pathname?.startsWith("/join")) {
    return null;
  }

  // Navigation items:
  // For logged-in users: Dashboard, New Interview
  // For guests (non-logged-in): Home, About Us, Contact
  const navItems = user
    ? [
      { label: "Dashboard", href: "/dashboard" },
      { label: "New Interview", href: "/dashboard/new" },
    ]
    : [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/#about" },
      { label: "Contact", href: "/#contact" },
    ];

  return (
    <>
      {/* Header Container:
          - At full top (!isScrolled): flush at top-0, full-width, translucent gray-200 with backdrop-blur
          - When scrolled (isScrolled): floating stadium capsule, translucent gray-200 with backdrop-blur-xl
      */}
      <header className="sticky top-0 z-[100] w-full no-print pointer-events-none">
        <div
          className={`mx-auto pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolled
            ? "w-[94%] sm:w-[90%] max-w-6xl rounded-[32px] translate-y-2.5 sm:translate-y-3 bg-gray-200/75 backdrop-blur-xl border border-gray-300/80 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.1),0_4px_12px_rgba(15,23,42,0.04)] px-5 sm:px-8 py-2.5 sm:py-3"
            : "w-full max-w-full rounded-[0px] translate-y-0 bg-gray-200/80 backdrop-blur-md border border-t-transparent border-x-transparent border-b-gray-300/80 shadow-none px-6 sm:px-10 lg:px-12 py-3.5 sm:py-4"
            }`}
        >
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* 1. Left: Brand Logo Lockup */}
            <Link
              href={user ? "/dashboard" : "/"}
              className="group flex items-center gap-2 hover:opacity-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl shrink-0"
            >
              <Brand size="md" subtitle="AI INTERVIEWER" />
            </Link>

            {/* 2. Middle: Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-11 text-[14px]">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`relative py-1 font-medium transition-colors hover:text-slate-900 ${isActive
                      ? "font-semibold text-slate-900"
                      : "text-slate-600"
                      }`}
                  >
                    {item.label}
                    {/* Active Underline Indicator matching brand blue theme */}
                    {isActive && (
                      <span
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 sm:w-7 h-[2.5px] bg-brand-600 rounded-full shadow-xs shadow-brand-500/40"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* 3. Right: Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">

              {/* User Profile (when logged in) or Sign In (when logged out) */}
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                    }}
                    className={`p-2 rounded-full text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 ${isScrolled ? "hover:bg-slate-100/90" : "hover:bg-slate-200/60"
                      } ${isProfileOpen ? (isScrolled ? "bg-slate-100/90" : "bg-slate-200/60") : ""}`}
                    aria-label="User Account"
                    title={user.email}
                  >
                    <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl py-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                        <p className="text-xs font-semibold text-slate-800 truncate" title={user.email}>
                          {user.email}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/new"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-brand-600" />
                          New Interview
                        </Link>
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="h-3.5 w-3.5 text-red-500" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-sm shadow-brand-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign in</span>
                </Link>
              )}

              {/* Mobile Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1.5 rounded-full text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu Card */}
        {isMobileMenuOpen && (
          <div
            className={`md:hidden mx-auto mt-2 rounded-2xl shadow-xl p-4 pointer-events-auto z-[110] animate-in fade-in slide-in-from-top-2 duration-150 ${isScrolled
              ? "max-w-6xl w-[95%] bg-gray-200/90 backdrop-blur-xl border border-gray-300/80"
              : "max-w-7xl mx-4 bg-gray-200/90 backdrop-blur-xl border border-gray-300/80"
              }`}
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-slate-200 my-2 pt-2">
                {user ? (
                  <>
                    <div className="px-3 py-1 text-xs text-slate-500 truncate mb-1">
                      {user.email}
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <Link
                      href="/login"
                      className="flex-1 text-center py-2 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="flex-1 text-center py-2 px-3 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-500/20"
                    >
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
