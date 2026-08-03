import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedOrganizationDemoData } from "../src/lib/seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  const email = "demo@stockeye.dev";
  const password = "demo1234";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("[seed] Demo user already exists — nothing to do.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const organizationId = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: "Demo Manager", email, passwordHash },
    });

    const org = await tx.organization.create({
      data: {
        name: "Demo Grocers",
        slug: "demo-grocers",
        settings: { create: {} },
      },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "OWNER" },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { activeOrgId: org.id },
    });

    return org.id;
  });

  await seedOrganizationDemoData(organizationId);

  console.log(
    `[seed] Created demo workspace.\n  Email:    ${email}\n  Password: ${password}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
