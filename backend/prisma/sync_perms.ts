import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "dashboard:read",
    "employees:read", "employees:write", "employees:delete",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read", "payroll:write", "payroll:approve",
    "recruitment:read", "recruitment:write",
    "performance:read", "performance:write",
    "reports:read", "reports:export",
    "security:read", "security:write",
    "orgmanagement:read", "orgmanagement:write",
    "compliance:read", "compliance:write",
    "onboarding:read", "onboarding:write",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "ess:read", "ess:write",
    "policies:read", "policies:write",
    "helpdesk:read", "helpdesk:write",
    "separation:read", "separation:write",
    "workflows:read", "workflows:write", "workflows:approve",
    "notifications:read",
  ],
  HR: [
    "dashboard:read",
    "employees:read", "employees:write",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read", "payroll:write", "payroll:approve",
    "recruitment:read", "recruitment:write",
    "onboarding:read", "onboarding:write",
    "performance:read", "performance:write",
    "reports:read", "reports:export",
    "compliance:read", "compliance:write",
    "policies:read", "policies:write",
    "helpdesk:read", "helpdesk:write",
    "separation:read", "separation:write",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "ess:read", "ess:write",
    "workflows:read", "workflows:write", "workflows:approve",
    "notifications:read",
  ],
  MANAGER: [
    "dashboard:read",
    "employees:read",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write", "leave:approve",
    "payroll:read",
    "performance:read", "performance:write",
    "tasks:read", "tasks:write",
    "reports:read",
    "expenses:read", "expenses:write", "expenses:approve",
    "travel:read", "travel:write", "travel:approve",
    "recruitment:read",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "ess:read", "ess:write",
    "separation:read",
    "workflows:read", "workflows:approve",
    "notifications:read",
  ],
  EMPLOYEE: [
    "dashboard:read",
    "attendance:read", "attendance:write",
    "leave:read", "leave:write",
    "payroll:read",
    "ess:read", "ess:write",
    "helpdesk:read", "helpdesk:write",
    "policies:read",
    "performance:read", "performance:write",
    "lms:read", "lms:write",
    "assets:read", "assets:write",
    "tasks:read", "tasks:write",
    "expenses:read", "expenses:write",
    "travel:read", "travel:write",
    "separation:read",
    "workflows:read", "workflows:approve",
    "notifications:read",
  ],
};

async function sync() {
  console.log("Syncing permissions in DB...");
  const allPerms = new Set<string>();
  Object.values(ROLE_PERMISSIONS).forEach((list) => list.forEach((p) => allPerms.add(p)));

  const permMap = new Map<string, string>();
  for (const code of allPerms) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
    permMap.set(code, p.id);
  }

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const code of perms) {
      const pid = permMap.get(code);
      if (pid) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: pid },
        });
      }
    }
    console.log(`Updated ${roleName} with ${perms.length} permissions.`);
  }

  console.log("Done syncing permissions successfully!");
  await prisma.$disconnect();
}

sync().catch((e) => {
  console.error(e);
  process.exit(1);
});
