import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create workspace",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Set up your organization in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
