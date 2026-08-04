import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Set up your workspace",
};

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Set up your workspace"
      subtitle="Create an organization to start managing inventory."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
