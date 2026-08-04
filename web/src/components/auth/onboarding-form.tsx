"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createOrganizationAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Grocers"
          autoFocus
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
