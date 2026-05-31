import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Brand size="lg" />
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Create your HR account
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Candidates never need an account — they join by link.
          </p>
          <AuthForm mode="signup" />
        </div>
      </div>
    </main>
  );
}
