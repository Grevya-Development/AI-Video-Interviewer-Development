import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; message?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Brand size="lg" />
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Welcome back
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Sign in to your HR account to run interviews.
          </p>

          <AuthForm
            mode="login"
            next={searchParams.next}
            error={searchParams.error}
            message={searchParams.message}
          />
        </div>
      </div>
    </main>
  );
}
