import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your warehouse command center."
      footer={
        <>
          New to Stock-Eye?{" "}
          <a href="/register" className="font-medium text-primary hover:underline">
            Create a workspace
          </a>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
