import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Brand size="md" />
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Not found</h1>
      <p className="mt-2 max-w-sm text-slate-500">
        This page, interview link, or report doesn&apos;t exist or has expired.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Go home
      </Link>
    </main>
  );
}
