"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { signIn, signOut, auth } from "@/auth";
import { seedOrganizationDemoData } from "@/lib/seed";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1, "Name is required"),
  organization: z.string().trim().min(2, "Organization name is required"),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

async function uniqueOrgSlug(name: string) {
  const base = slugify(name) || "org";
  let slug = base;
  let counter = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organization: formData.get("organization"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, organization } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await uniqueOrgSlug(organization);

  const organizationId = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email: normalizedEmail, passwordHash },
    });

    const org = await tx.organization.create({
      data: {
        name: organization,
        slug,
        settings: { create: {} },
      },
    });

    await tx.membership.create({
      data: { userId: created.id, organizationId: org.id, role: "OWNER" },
    });

    await tx.user.update({
      where: { id: created.id },
      data: { activeOrgId: org.id },
    });

    return org.id;
  });

  await seedOrganizationDemoData(organizationId);

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created. Please sign in." };
    }
    throw error;
  }

  return {};
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Something went wrong. Please try again." };
    }
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const orgSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required"),
});

export async function createOrganizationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be signed in to create a workspace." };
  }

  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const slug = await uniqueOrgSlug(parsed.data.name);

  await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        settings: { create: {} },
      },
    });

    await tx.membership.create({
      data: { userId, organizationId: org.id, role: "OWNER" },
    });

    await tx.user.update({
      where: { id: userId },
      data: { activeOrgId: org.id },
    });
  });

  redirect("/dashboard");
}
