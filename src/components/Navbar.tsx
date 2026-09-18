"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import {
  Search,
  User,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  LogIn,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Video,
} from "lucide-react";

interface NavbarProps {
  user: { email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  // Scroll detection: sticky full-width at top-0 vs floating stadium pill on scroll
  const [isScrolled, setIsScrolled] = useState(false);

  // State management
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // References for click-outside detection
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    setIsNotificationOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Global keyboard shortcut ('/' or 'Cmd+K') to toggle search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsProfileOpen(false);
        setIsNotificationOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide navbar on candidate interview screen (/join/[token])
  if (pathname?.startsWith("/join")) {
    return null;
  }

  // Navigation items: "Home", "About Us", "Contact" (Products removed per user request)
  const navItems = [
    { label: "Home", href: user ? "/dashboard" : "/" },
    { label: "About Us", href: "/#about" },
    { label: "Contact", href: "/#contact" },
  ];

  // Search quick links
  const searchQuickLinks = [
    {
      title: "New AI Interview Session",
      desc: "Set up candidate job role & question flow",
      icon: PlusCircle,
      href: "/dashboard/new",
    },
    {
      title: "HR Interview Dashboard",
      desc: "View active candidates and score reports",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Groq LLM Follow-Ups",
      desc: "Smart autonomous question generation",
      icon: Sparkles,
      href: "/#features",
    },
    {
      title: "LiveKit WebRTC Video Room",
      desc: "Ultra-low latency audio & video streaming",
      icon: Video,
      href: "/#features",
    },
  ];

  const filteredLinks = searchQuery.trim()
    ? searchQuickLinks.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchQuickLinks;

  return (
    <>
      {/* Header Container:
          - At full top (!isScrolled): flush at top-0, full-width, matches website background (slate-50)
          - When scrolled (isScrolled): floating stadium capsule with smooth 500ms spring morphing transition
      */}
      <header className="sticky top-0 z-50 w-full no-print pointer-events-none">
        <div
          className={`mx-auto pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isScrolled
              ? "w-[94%] sm:w-[90%] max-w-6xl rounded-[32px] translate-y-2.5 sm:translate-y-3 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.1),0_4px_12px_rgba(15,23,42,0.04)] px-5 sm:px-8 py-2.5 sm:py-3"
              : "w-full max-w-full rounded-[0px] translate-y-0 bg-slate-50/95 backdrop-blur-md border border-t-transparent border-x-transparent border-b-slate-200/80 shadow-none px-6 sm:px-10 lg:px-12 py-3.5 sm:py-4"
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
                const isHome = item.label === "Home";
                const isActive = isHome
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname === item.href;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`relative py-1 font-medium transition-colors hover:text-slate-900 ${
                      isActive
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

            {/* 3. Right: Search & Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Search Pill Bar */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={`group flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                  isScrolled
                    ? "bg-slate-100/90 hover:bg-slate-200/70 border-slate-200/80 text-slate-600 hover:text-slate-900"
                    : "bg-white hover:bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-900 shadow-2xs"
                }`}
                title="Search (Press / or Cmd+K)"
                aria-label="Search"
              >
                <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-600 transition-colors" />
                <span className="hidden sm:inline font-medium">Search...</span>
                <kbd className="hidden sm:inline-flex items-center justify-center h-4 px-1.5 text-[10px] font-mono text-slate-500 bg-slate-200/60 rounded font-semibold border border-slate-300/40">
                  /
                </kbd>
              </button>

              {/* User Profile (when logged in) or Sign In (when logged out) */}
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotificationOpen(false);
                    }}
                    className={`p-2 rounded-full text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                      isScrolled ? "hover:bg-slate-100/90" : "hover:bg-slate-200/60"
                    } ${isProfileOpen ? (isScrolled ? "bg-slate-100/90" : "bg-slate-200/60") : ""}`}
                    aria-label="User Account"
                    title={user.email}
                  >
                    <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                        <form action="/auth/signout" method="post">
                          <button
                            type="submit"
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            <LogOut className="h-3.5 w-3.5 text-red-500" />
                            Sign out
                          </button>
                        </form>
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

              {/* Notification Bell Trigger */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationOpen(!isNotificationOpen);
                    setIsProfileOpen(false);
                  }}
                  className={`p-2 rounded-full text-slate-700 transition-colors relative focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                    isScrolled ? "hover:bg-slate-100/90" : "hover:bg-slate-200/60"
                  } ${isNotificationOpen ? (isScrolled ? "bg-slate-100/90" : "bg-slate-200/60") : ""}`}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  {/* Active notification indicator dot */}
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </button>

                {/* Notification Popover */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                      <span className="text-xs font-semibold text-slate-800">Live Status</span>
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        All Systems Operational
                      </span>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-800">LiveKit WebRTC</p>
                          <p className="text-[11px] text-slate-500">
                            Video & audio streaming engine is ready.
                          </p>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-800">Groq LLM Copilot</p>
                          <p className="text-[11px] text-slate-500">
                            Real-time AI follow-ups active.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
            className={`md:hidden mx-auto mt-2 rounded-2xl shadow-xl p-4 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150 ${
              isScrolled
                ? "max-w-6xl w-[95%] bg-white/95 backdrop-blur-xl border border-slate-200"
                : "max-w-7xl mx-4 bg-slate-50/95 backdrop-blur-xl border border-slate-200"
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
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/new"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      New Interview
                    </Link>
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

      {/* Global Interactive Search Modal / Command Palette */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-5 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Search Bar Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interviews, candidate reports, features..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Links / Filtered Results */}
            <div className="pt-3 max-h-[60vh] overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Navigation
              </div>
              {filteredLinks.length > 0 ? (
                filteredLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setIsSearchOpen(false)}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                    </Link>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No matching results found for &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>

            {/* Modal Footer Key Hints */}
            <div className="border-t border-slate-200/80 pt-3 mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">
                  Esc
                </kbd>{" "}
                to close
              </span>
              <span className="font-medium text-slate-500">Grevya AI Interviewer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
