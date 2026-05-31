import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardHeader } from "@/components/DashboardHeader";
import { NewSessionForm } from "@/components/NewSessionForm";

export default async function NewSessionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">New interview</h1>
        <p className="mb-6 text-sm text-slate-500">
          Define the role and the questions you want to cover.
        </p>
        <NewSessionForm />
      </main>
    </div>
  );
}
