import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-12">
        <div className="card p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Reset your password</h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter your new password below. It must be at least 6 characters.
          </p>
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
