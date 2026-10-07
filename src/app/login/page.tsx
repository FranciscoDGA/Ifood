import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-ink-50 to-ink-100 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-7 shadow-xl">
            <div className="h-9 w-9 rounded-xl bg-brand-500" />
            <div className="mt-5 h-8 w-full animate-pulse rounded-lg bg-ink-100" />
            <div className="mt-4 h-9 w-full rounded-lg bg-ink-100" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
