import Link from "next/link";
import { Brand } from "@/components/Brand";

export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard">
          <Brand size="md" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
