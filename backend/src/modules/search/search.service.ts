import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { formatDate, hashStringToRange } from "../../serializers/helpers";

export interface SearchResultEntry {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  meta: string;
  avatar: string | null;
  href: string;
  keywords: string[];
}

export async function globalSearch(query: string): Promise<SearchResultEntry[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const contains = { contains: q, mode: "insensitive" } as const;

  const where: Prisma.EmployeeWhereInput = {
    OR: [
      { firstName: contains },
      { lastName: contains },
      { employeeCode: contains },
      { personalEmail: contains },
      { designation: { title: contains } },
      { department: { name: contains } },
    ],
  };

  const [employees, leaveRequests, payrollRuns] = await Promise.all([
    prisma.employee.findMany({
      where,
      take: 10,
      include: { designation: true, department: true },
      orderBy: { employeeCode: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        OR: [
          { employee: { firstName: contains } },
          { employee: { lastName: contains } },
          { employee: { employeeCode: contains } },
          { leaveType: { name: contains } },
          { status: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payrollRun.findMany({
      where: {
        OR: [
          { period: contains },
          { status: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  const entries: SearchResultEntry[] = [];

  for (const emp of employees) {
    const name = `${emp.firstName} ${emp.lastName}`;
    const genderPath = emp.gender?.toLowerCase() === "female" ? "women" : "men";
    const avatarId = hashStringToRange(emp.employeeCode, 1, 99);

    entries.push({
      id: emp.employeeCode,
      type: "Employee",
      title: name,
      subtitle: `${emp.designation?.title ?? ""} · ${emp.department?.name ?? ""}`,
      meta: emp.personalEmail ?? "",
      avatar: `https://randomuser.me/api/portraits/${genderPath}/${avatarId}.jpg`,
      href: `/employees/${emp.employeeCode}`,
      keywords: [name.toLowerCase(), emp.employeeCode.toLowerCase(), (emp.personalEmail ?? "").toLowerCase()],
    });
  }

  for (const req of leaveRequests) {
    const employeeName = req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : "";
    entries.push({
      id: req.id,
      type: "Leave Request",
      title: `${employeeName} - ${req.leaveType?.name ?? ""}`,
      subtitle: `${formatDate(req.startDate) ?? ""} to ${formatDate(req.endDate) ?? ""}`,
      meta: req.status,
      avatar: null,
      href: "/leave",
      keywords: [employeeName.toLowerCase(), (req.leaveType?.name ?? "").toLowerCase(), req.status.toLowerCase()],
    });
  }

  for (const run of payrollRuns) {
    const period = `${run.period}`;
    entries.push({
      id: `PR-${run.year}-${String(run.month).padStart(2, "0")}`,
      type: "Payroll Run",
      title: period,
      subtitle: `${run.totalEmployees} employees`,
      meta: run.status,
      avatar: null,
      href: "/payroll",
      keywords: [period.toLowerCase(), run.status.toLowerCase(), String(run.year)],
    });
  }

  // Relevance sort: starts-with first, then contains, matching mock searchIndex.js.
  const startsWith = entries.filter((e) => e.keywords.some((k) => k.startsWith(q)));
  const containsMatches = entries.filter((e) => !startsWith.includes(e) && e.keywords.some((k) => k.includes(q)));
  return [...startsWith, ...containsMatches].slice(0, 20);
}
