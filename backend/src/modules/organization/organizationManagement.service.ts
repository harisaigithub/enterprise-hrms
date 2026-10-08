import { prisma } from "../../lib/prisma";

export class OrganizationManagementService {

    // =========================================================
    // COMPANY
    // =========================================================

    async getCompany() {
        const company = await prisma.company.findFirst({
            orderBy: {
                name: "asc",
            },
        });

        if (!company) {
            throw new Error("Company not found");
        }

        return this.mapCompany(company);
    }

    async updateCompany(patch: any) {
        const company = await prisma.company.findFirst({
            orderBy: {
                name: "asc",
            },
        });

        if (!company) {
            throw new Error("Company not found");
        }

        const updated = await prisma.company.update({
            where: {
                id: company.id,
            },
            data: {
                ...(patch.name !== undefined && { name: patch.name }),
                ...(patch.registrationNumber !== undefined && {
                    registrationNumber: patch.registrationNumber,
                }),
                ...(patch.country !== undefined && {
                    country: patch.country,
                }),
                ...(patch.currency !== undefined && {
                    currency: patch.currency,
                }),
            },
        });

        return this.mapCompany(updated);
    }

    // =========================================================
    // BUSINESS UNITS
    // =========================================================

    async getBusinessUnits() {
        const businessUnits = await prisma.businessUnit.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return businessUnits.map((bu) => ({
            id: bu.id,
            name: bu.name,
            companyId: bu.companyId,
            isActive: bu.isActive,
            status: bu.isActive ? "Active" : "Inactive",
        }));
    }

    async addBusinessUnit(data: any) {
        if (!data.name?.trim()) {
            throw new Error("Business Unit name is required");
        }

        if (!data.companyId) {
            throw new Error("Company ID is required");
        }

        const company = await prisma.company.findUnique({
            where: {
                id: data.companyId,
            },
        });

        if (!company) {
            throw new Error("Company not found");
        }

        const existing = await prisma.businessUnit.findFirst({
            where: {
                companyId: data.companyId,
                name: data.name.trim(),
            },
        });

        if (existing) {
            throw new Error("Business Unit with this name already exists");
        }

        const businessUnit = await prisma.businessUnit.create({
            data: {
                name: data.name.trim(),
                companyId: data.companyId,
            },
        });

        return {
            id: businessUnit.id,
            name: businessUnit.name,
            companyId: businessUnit.companyId,
            isActive: businessUnit.isActive,
            status: businessUnit.isActive ? "Active" : "Inactive",
        };
    }

    // =========================================================
    // DEPARTMENTS
    // =========================================================

    async getDepartments() {
        const departments = await prisma.department.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return departments.map((dept) => ({
            id: dept.id,
            name: dept.name,
            businessUnitId: dept.businessUnitId,
            isActive: dept.isActive,
            status: dept.isActive ? "Active" : "Inactive",
        }));
    }

    async addDepartment(data: any) {
        if (!data.name?.trim()) {
            throw new Error("Department name is required");
        }

        if (!data.businessUnitId) {
            throw new Error("Business Unit ID is required");
        }

        const businessUnit = await prisma.businessUnit.findUnique({
            where: {
                id: data.businessUnitId,
            },
        });

        if (!businessUnit) {
            throw new Error("Business Unit not found");
        }

        const existing = await prisma.department.findFirst({
            where: {
                businessUnitId: data.businessUnitId,
                name: data.name.trim(),
            },
        });

        if (existing) {
            throw new Error("Department with this name already exists");
        }

        const department = await prisma.department.create({
            data: {
                name: data.name.trim(),
                companyId: businessUnit.companyId,
                businessUnitId: data.businessUnitId,
            },
        });

        return {
            id: department.id,
            name: department.name,
            businessUnitId: department.businessUnitId,
            isActive: department.isActive,
            status: department.isActive ? "Active" : "Inactive",
        };
    }

    // =========================================================
    // LOCATIONS
    // =========================================================
    // =========================================================
    // TEAMS
    // =========================================================

    async getTeams() {
        const teams = await prisma.team.findMany({
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return teams.map((team) => ({
            id: team.id,
            name: team.name,
            description: team.description,
            departmentId: team.departmentId,
            departmentName: team.department.name,
            employeeCount: team._count.employees,
            isActive: team.isActive,
            status: team.isActive ? "Active" : "Inactive",
        }));
    }

    async addTeam(data: any) {
        if (!data.name?.trim()) {
            throw new Error("Team name is required");
        }

        if (!data.departmentId) {
            throw new Error("Department ID is required");
        }

        const department = await prisma.department.findUnique({
            where: { id: data.departmentId },
        });

        if (!department) {
            throw new Error("Department not found");
        }
        if (!department.isActive) {
            throw new Error("Cannot create a team under an inactive department");
        }

        const existing = await prisma.team.findFirst({
            where: {
                departmentId: data.departmentId,
                name: { equals: data.name.trim(), mode: "insensitive" },
            },
        });

        if (existing) {
            throw new Error(
                "Team with this name already exists in this department"
            );
        }

        const team = await prisma.team.create({
            data: {
                name: data.name.trim(),
                description: data.description?.trim() || null,
                departmentId: data.departmentId,
            },
        });

        return {
            id: team.id,
            name: team.name,
            description: team.description,
            departmentId: team.departmentId,
            isActive: team.isActive,
            status: team.isActive ? "Active" : "Inactive",
        };
    }

    async getTeamMembers(teamId: string) {
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { id: true, name: true, departmentId: true, isActive: true },
        });
        if (!team) throw new Error("Team not found");

        const employees = await prisma.employee.findMany({
            where: { departmentId: team.departmentId, isSoftDeleted: false },
            select: {
                id: true, employeeCode: true, firstName: true, lastName: true,
                status: true, teamId: true,
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });

        return {
            team,
            employees: employees.map((employee) => ({
                ...employee,
                name: `${employee.firstName} ${employee.lastName}`.trim(),
                isMember: employee.teamId === team.id,
                canAssign: !["Inactive", "Terminated"].includes(employee.status),
            })),
        };
    }

    async updateTeam(teamId: string, data: any) {
        const existing = await prisma.team.findUnique({ where: { id: teamId } });
        if (!existing) throw new Error("Team not found");

        const name = data.name !== undefined ? String(data.name).trim() : existing.name;
        if (!name) throw new Error("Team name is required");

        const duplicate = await prisma.team.findFirst({
            where: { departmentId: existing.departmentId, name: { equals: name, mode: "insensitive" }, NOT: { id: teamId } },
            select: { id: true },
        });
        if (duplicate) throw new Error("Team with this name already exists in this department");

        const nextActive = data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive;
        const updated = await prisma.$transaction(async (tx: any) => {
            if (!nextActive && existing.isActive) {
                await tx.employee.updateMany({ where: { teamId }, data: { teamId: null } });
            }
            return tx.team.update({
                where: { id: teamId },
                data: {
                    name,
                    description: data.description !== undefined ? (String(data.description).trim() || null) : undefined,
                    isActive: nextActive,
                },
                include: { _count: { select: { employees: true } }, department: { select: { name: true } } },
            });
        });

        return {
            id: updated.id, name: updated.name, description: updated.description,
            departmentId: updated.departmentId, departmentName: updated.department.name,
            employeeCount: updated._count.employees, isActive: updated.isActive,
            status: updated.isActive ? "Active" : "Inactive",
        };
    }

    async setTeamMembers(teamId: string, employeeIds: string[]) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new Error("Team not found");
        if (!team.isActive) throw new Error("Cannot assign members to an inactive team");

        const uniqueIds = [...new Set(Array.isArray(employeeIds) ? employeeIds : [])];
        const employees = uniqueIds.length ? await prisma.employee.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, departmentId: true, status: true, isSoftDeleted: true },
        }) : [];

        if (employees.length !== uniqueIds.length) throw new Error("One or more selected employees do not exist");
        if (employees.some((e) => e.isSoftDeleted)) throw new Error("Deleted employees cannot be assigned to a team");
        if (employees.some((e) => e.departmentId !== team.departmentId)) throw new Error("All team members must belong to the team's department");
        if (employees.some((e) => ["Inactive", "Terminated"].includes(e.status))) throw new Error("Inactive or terminated employees cannot be assigned to a team");

        await prisma.$transaction(async (tx: any) => {
            await tx.employee.updateMany({
                where: { teamId, ...(uniqueIds.length ? { id: { notIn: uniqueIds } } : {}) },
                data: { teamId: null },
            });
            if (uniqueIds.length) {
                await tx.employee.updateMany({
                    where: { id: { in: uniqueIds }, departmentId: team.departmentId },
                    data: { teamId },
                });
            }
        });

        const refreshed = await prisma.team.findUnique({
            where: { id: teamId }, include: { _count: { select: { employees: true } } },
        });
        return { teamId, employeeCount: refreshed?._count.employees ?? 0, employeeIds: uniqueIds };
    }

    async getLocations() {
        const locations = await prisma.location.findMany({
            include: {
                _count: {
                    select: {
                        employees: {
                            where: {
                                status: "Active",
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return locations.map((location: any) => ({
            id: location.id,
            name: location.name,
            city: location.city ?? "",
            country: location.country ?? "",
            status: location.isActive ? "Active" : "Inactive",
            employeeCount: location._count?.employees ?? 0,
        }));
    }

    async addLocation(data: any) {
        if (!data.name?.trim()) {
            throw new Error("Location name is required");
        }

        const company = await prisma.company.findFirst({
            where: {
                isActive: true,
            },
        });

        if (!company) {
            throw new Error("Company not found");
        }

        const location = await prisma.location.create({
            data: {
                name: data.name.trim(),
                companyId: company.id,
                address: data.address?.trim() || null,
            },
        });

        return {
            id: location.id,
            name: location.name,
            city: "",
            country: "",
            status: location.isActive ? "Active" : "Inactive",
            employeeCount: 0,
        };
    }

    async deactivateLocation(id: string) {
        const location = await prisma.location.findUnique({
            where: {
                id,
            },
        });

        if (!location) {
            return {
                error: "Location not found",
            };
        }

        const employeeCount = await prisma.employee.count({
            where: {
                locationId: id,
                status: "Active",
            },
        });

        if (employeeCount > 0) {
            return {
                error: `Cannot deactivate this location. ${employeeCount} active employee(s) are still assigned.`,
            };
        }

        const updated = await prisma.location.update({
            where: {
                id,
            },
            data: {
                isActive: false,
            },
        });

        return {
            location: {
                id: updated.id,
                name: updated.name,
                city: (updated as any).city ?? "",
                country: (updated as any).country ?? "",
                status: updated.isActive ? "Active" : "Inactive",
                employeeCount: 0,
            },
        };
    }


    async activateLocation(id: string) {
        const location = await prisma.location.findUnique({
            where: { id },
        });

        if (!location) {
            return {
                error: "Location not found",
            };
        }

        if (location.isActive) {
            return {
                location: {
                    id: location.id,
                    name: location.name,
                    city: (location as any).city ?? "",
                    country: (location as any).country ?? "",
                    status: "Active",
                    employeeCount: await prisma.employee.count({
                        where: {
                            locationId: id,
                            status: "Active",
                        },
                    }),
                },
            };
        }

        const updated = await prisma.location.update({
            where: { id },
            data: {
                isActive: true,
            },
        });

        const employeeCount = await prisma.employee.count({
            where: {
                locationId: id,
                status: "Active",
            },
        });

        return {
            location: {
                id: updated.id,
                name: updated.name,
                city: (updated as any).city ?? "",
                country: (updated as any).country ?? "",
                status: updated.isActive ? "Active" : "Inactive",
                employeeCount,
            },
        };
    }
    // =========================================================
    // COST CENTERS
    // =========================================================

    async getCostCenters() {
        const costCenters = await prisma.costCenter.findMany({
            include: {
                departments: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return costCenters.map((cc: any) => ({
            id: cc.id,
            code: cc.code,
            name: cc.name,
            departmentIds: cc.departments?.map((d: any) => d.id) ?? [],
            isActive: cc.isActive,
            status: cc.isActive ? "Active" : "Inactive",
        }));
    }

    async addCostCenter(data: any) {
        const code = data.code?.trim();
        const name = data.name?.trim();
        const departmentIds: string[] = Array.isArray(data.departmentIds)
            ? [...new Set<string>(
                data.departmentIds.filter(
                    (id: unknown): id is string => typeof id === "string"
                )
            )]
            : [];

        if (!code) {
            throw new Error("Cost Center code is required");
        }

        if (!name) {
            throw new Error("Cost Center name is required");
        }

        const existing = await prisma.costCenter.findFirst({
            where: {
                code,
            },
        });

        if (existing) {
            throw new Error("Cost Center with this code already exists");
        }

        if (departmentIds.length > 0) {
            const validDepartmentCount = await prisma.department.count({
                where: {
                    id: {
                        in: departmentIds,
                    },
                },
            });

            if (validDepartmentCount !== departmentIds.length) {
                throw new Error("One or more selected departments do not exist");
            }
        }

        const costCenter = await prisma.costCenter.create({
            data: {
                code,
                name,
                ...(departmentIds.length > 0 && {
                    departments: {
                        connect: departmentIds.map((id: string) => ({
                            id,
                        })),
                    },
                }),
            },
            include: {
                departments: true,
            },
        });

        return {
            id: costCenter.id,
            code: costCenter.code,
            name: costCenter.name,
            departmentIds:
                (costCenter as any).departments?.map((d: any) => d.id) ?? [],
            isActive: costCenter.isActive,
            status: costCenter.isActive ? "Active" : "Inactive",
        };
    }

    async updateCostCenter(id: string, data: any) {
        const existing = await prisma.costCenter.findUnique({
            where: {
                id,
            },
        });

        if (!existing) {
            throw new Error("Cost Center not found");
        }

        const code =
            data.code !== undefined
                ? data.code?.trim()
                : existing.code;

        const name =
            data.name !== undefined
                ? data.name?.trim()
                : existing.name;

        if (!code) {
            throw new Error("Cost Center code is required");
        }

        if (!name) {
            throw new Error("Cost Center name is required");
        }

        const duplicate = await prisma.costCenter.findFirst({
            where: {
                code,
                id: {
                    not: id,
                },
            },
        });

        if (duplicate) {
            throw new Error("Cost Center with this code already exists");
        }

        let departmentIds: string[] | undefined;

        if (data.departmentIds !== undefined) {
            if (!Array.isArray(data.departmentIds)) {
                throw new Error("Department IDs must be an array");
            }

            const normalizedDepartmentIds: string[] = [
                ...new Set<string>(
                    data.departmentIds.filter(
                        (id: unknown): id is string => typeof id === "string"
                    )
                ),
            ];

            if (normalizedDepartmentIds.length > 0) {
                const validDepartmentCount = await prisma.department.count({
                    where: {
                        id: {
                            in: normalizedDepartmentIds,
                        },
                    },
                });

                if (validDepartmentCount !== normalizedDepartmentIds.length) {
                    throw new Error(
                        "One or more selected departments do not exist"
                    );
                }
            }

            departmentIds = normalizedDepartmentIds;
        }

        const costCenter = await prisma.costCenter.update({
            where: {
                id,
            },
            data: {
                code,
                name,
                ...(departmentIds !== undefined && {
                    departments: {
                        set: departmentIds.map((departmentId: string) => ({
                            id: departmentId,
                        })),
                    },
                }),
            },
            include: {
                departments: true,
            },
        });

        return {
            id: costCenter.id,
            code: costCenter.code,
            name: costCenter.name,
            departmentIds:
                (costCenter as any).departments?.map((d: any) => d.id) ?? [],
            isActive: costCenter.isActive,
            status: costCenter.isActive ? "Active" : "Inactive",
        };
    }

    async deactivateCostCenter(id: string) {
        const existing = await prisma.costCenter.findUnique({
            where: {
                id,
            },
            include: {
                departments: true,
            },
        });

        if (!existing) {
            throw new Error("Cost Center not found");
        }

        if (!existing.isActive) {
            throw new Error("Cost Center is already inactive");
        }

        const costCenter = await prisma.costCenter.update({
            where: {
                id,
            },
            data: {
                isActive: false,
            },
            include: {
                departments: true,
            },
        });

        return {
            id: costCenter.id,
            code: costCenter.code,
            name: costCenter.name,
            departmentIds:
                (costCenter as any).departments?.map((d: any) => d.id) ?? [],
            isActive: costCenter.isActive,
            status: "Inactive",
        };
    }

    async activateCostCenter(id: string) {
        const existing = await prisma.costCenter.findUnique({
            where: {
                id,
            },
            include: {
                departments: true,
            },
        });

        if (!existing) {
            throw new Error("Cost Center not found");
        }

        if (existing.isActive) {
            throw new Error("Cost Center is already active");
        }

        const costCenter = await prisma.costCenter.update({
            where: {
                id,
            },
            data: {
                isActive: true,
            },
            include: {
                departments: true,
            },
        });

        return {
            id: costCenter.id,
            code: costCenter.code,
            name: costCenter.name,
            departmentIds:
                (costCenter as any).departments?.map((d: any) => d.id) ?? [],
            isActive: costCenter.isActive,
            status: "Active",
        };
    }
    // =========================================================
    // DESIGNATIONS
    // =========================================================

    async getDesignations() {
        const designations = await prisma.designation.findMany({
            orderBy: {
                title: "asc",
            },
        });

        return designations.map((d) => ({
            id: d.id,
            title: d.title,
            grade: d.grade,
            isActive: d.isActive,
            status: d.isActive ? "Active" : "Inactive",
        }));
    }

    async addDesignation(data: any) {
        const title = data.title?.trim();

        if (!title) {
            throw new Error("Designation title is required");
        }

        const existing = await prisma.designation.findFirst({
            where: {
                title: title,
            },
        });

        if (existing) {
            throw new Error("Designation already exists");
        }

        const designation = await prisma.designation.create({
            data: {
                title: title,
                grade: data.grade?.trim() || null,
                level: data.level?.trim() || "L3",
                isActive: data.isActive ?? true,
            },
        });

        return {
            id: designation.id,
            title: designation.title,
            grade: designation.grade,
            level: designation.level,
            isActive: designation.isActive,
            status: designation.isActive ? "Active" : "Inactive",
        };
    }
    // =========================================================
    // GRADES
    // =========================================================

    async getGrades() {
        try {
            const grades = await prisma.grade.findMany({
                orderBy: {
                    sortOrder: "asc",
                },
            });

            return grades.map((grade) => ({
                id: grade.id,
                code: grade.code,
                name: grade.name,
                sortOrder: grade.sortOrder,
                order: grade.sortOrder,
                isActive: grade.isActive,
                status: grade.isActive ? "Active" : "Inactive",
            }));
        } catch (error) {
            console.error(" GET GRADES PRISMA ERROR:", error);
            throw error;
        }
    }

    async addGrade(data: any) {
        const code = data.code?.trim();
        const name = data.name?.trim();

        if (!code) {
            throw new Error("Grade code is required");
        }

        if (!name) {
            throw new Error("Grade name is required");
        }

        const existing = await prisma.grade.findFirst({
            where: {
                OR: [
                    { code },
                    { name },
                ],
            },
        });

        if (existing) {
            throw new Error("Grade code or name already exists");
        }

        const count = await prisma.grade.count();

        const sortOrder =
            data.sortOrder !== undefined
                ? Number(data.sortOrder)
                : count + 1;

        const grade = await prisma.grade.create({
            data: {
                code,
                name,
                sortOrder,
                isActive: data.isActive ?? true,
            },
        });

        return {
            id: grade.id,
            code: grade.code,
            name: grade.name,
            sortOrder: grade.sortOrder,
            order: grade.sortOrder,
            isActive: grade.isActive,
            status: grade.isActive ? "Active" : "Inactive",
        };
    }

    // =========================================================
    // REPORTING ROSTER
    // =========================================================

    async getRoster() {
        const employees = await prisma.employee.findMany({
            include: {
                department: true,
                reportingManager: true,
            },
            orderBy: [
                {
                    firstName: "asc",
                },
                {
                    lastName: "asc",
                },
            ],
        });

        return employees.map((employee: any) => ({
            id: employee.id,
            name:
                employee.name ??
                `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
            title:
                employee.title ??
                employee.designation ??
                employee.designationName ??
                "",
            departmentId: employee.departmentId,
            managerId: employee.reportingManagerId ?? null,
        }));
    }

    // =========================================================
    // REPORTING MANAGER
    // =========================================================

    async updateReportingManager(
        employeeId: string,
        newManagerId: string | null,
        userId: string
    ) {
        const employee = await prisma.employee.findUnique({
            where: {
                id: employeeId,
            },
        });

        if (!employee) {
            return {
                error: "Employee not found",
            };
        }

        if (newManagerId === employeeId) {
            return {
                error: "An employee cannot report to themselves.",
            };
        }

        if (newManagerId) {
            const manager = await prisma.employee.findUnique({
                where: {
                    id: newManagerId,
                },
            });

            if (!manager) {
                return {
                    error: "Selected reporting manager does not exist.",
                };
            }

            // Detect circular hierarchy
            let currentId: string | null = newManagerId;
            const visited = new Set<string>();

            while (currentId) {
                if (currentId === employeeId) {
                    return {
                        error:
                            "Circular reporting relationship detected. This change would create a reporting cycle.",
                    };
                }

                if (visited.has(currentId)) {
                    break;
                }

                visited.add(currentId);

                const current: { reportingManagerId: string | null } | null =
                    await prisma.employee.findUnique({
                        where: {
                            id: currentId,
                        },
                        select: {
                            reportingManagerId: true,
                        },
                    });

                currentId = current?.reportingManagerId ?? null;
            }
        }

        // Get authenticated user
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                employee: true,
            },
        });

        if (!user) {
            throw new Error("Authenticated user not found");
        }

        if (!user.employee) {
            throw new Error(
                "Authenticated user is not linked to an employee"
            );
        }

        // Actual Employee.id of logged-in user
        const actorId = user.employee.id;

        const oldManagerId = employee.reportingManagerId ?? null;

        const updated = await prisma.employee.update({
            where: {
                id: employeeId,
            },
            data: {
                reportingManagerId: newManagerId,
            },
        });

        // Audit entry
        await this.createAuditLog({
            entityType: "Employee",
            entityId: employeeId,
            field: "reportingManagerId",
            oldValue: oldManagerId,
            newValue: newManagerId,
            actorId,
        });

        return {
            employee: {
                id: updated.id,
                name:
                    `${updated.firstName} ${updated.lastName}`.trim(),
                title: "",
                departmentId: updated.departmentId,
                managerId: updated.reportingManagerId ?? null,
            },
        };
    }

    // =========================================================
    // BULK DEPARTMENT REASSIGNMENT
    // =========================================================

    async bulkReassignDepartment(
        employeeIds: string[],
        newDepartmentId: string,
        userId: string
    ) {
        if (!employeeIds?.length) {
            throw new Error("No employees selected");
        }

        if (!newDepartmentId) {
            throw new Error("New department is required");
        }

        const department = await prisma.department.findUnique({
            where: {
                id: newDepartmentId,
            },
        });

        if (!department) {
            throw new Error("New department not found");
        }

        // Get authenticated user's employee
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                employee: true,
            },
        });

        if (!user) {
            throw new Error("Authenticated user not found");
        }

        if (!user.employee) {
            throw new Error(
                "Authenticated user is not linked to an employee"
            );
        }

        const actorId = user.employee.id;

        let changedCount = 0;

        await prisma.$transaction(async (tx: any) => {
            for (const employeeId of employeeIds) {
                const employee = await tx.employee.findUnique({
                    where: {
                        id: employeeId,
                    },
                });

                if (!employee) {
                    continue;
                }

                const oldDepartmentId = employee.departmentId;

                if (oldDepartmentId === newDepartmentId) {
                    continue;
                }

                await tx.employee.update({
                    where: {
                        id: employeeId,
                    },
                    data: {
                        departmentId: newDepartmentId,
                    },
                });

                await tx.organizationAuditLog.create({
                    data: {
                        entityType: "Employee",
                        entityId: employeeId,
                        field: "departmentId",
                        oldValue: oldDepartmentId,
                        newValue: newDepartmentId,
                        actorId: actorId,
                    },
                });

                changedCount++;
            }
        });

        return {
            changedCount,
            roster: await this.getRoster(),
        };
    }

    // =========================================================
    // AUDIT LOG
    // =========================================================

    async getAuditLog() {
        const logs = await prisma.organizationAuditLog.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });

        return logs.map((entry) => ({
            id: entry.id,
            entityType: entry.entityType,
            entityId: entry.entityId,
            field: entry.field,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            actor: entry.actor
                ? `${entry.actor.firstName} ${entry.actor.lastName}`.trim()
                : "System",
            actorId: entry.actor?.id ?? null,
            employeeCode: entry.actor?.employeeCode ?? null,
            timestamp: entry.createdAt,
        }));
    }

    private async createAuditLog(data: {
        entityType: string;
        entityId: string;
        field: string;
        oldValue: string | null;
        newValue: string | null;
        actorId: string;
    }) {
        return prisma.organizationAuditLog.create({
            data: {
                entityType: data.entityType,
                entityId: data.entityId,
                field: data.field,
                oldValue: data.oldValue,
                newValue: data.newValue,
                actorId: data.actorId,
            },
        });
    }

    // =========================================================
    // COMPANY MAPPER
    // =========================================================

    // =========================================================
    // UPDATE DESIGNATION & SOFT DEACTIVATION
    // =========================================================

    async updateDesignation(id: string, data: any) {
        if (data.isActive === false) {
            const count = await prisma.employee.count({
                where: { designationId: id, status: "Active" },
            });
            if (count > 0) {
                throw new Error(`Cannot deactivate designation because it is currently assigned to ${count} active employee(s).`);
            }
        }

        const updated = await prisma.designation.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title.trim() }),
                ...(data.grade !== undefined && { grade: data.grade?.trim() || null }),
                ...(data.level !== undefined && { level: data.level }),
                ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
            },
        });

        return {
            id: updated.id,
            title: updated.title,
            grade: updated.grade,
            level: updated.level,
            isActive: updated.isActive,
            status: updated.isActive ? "Active" : "Inactive",
        };
    }

    // =========================================================
    // DYNAMIC ORGANIZATION CHART
    // =========================================================

    async getOrganizationChart() {
        const employees = await prisma.employee.findMany({
            where: {
                status: { notIn: ["Inactive", "Terminated"] },
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                reportingManagerId: true,
                designation: { select: { title: true, level: true } },
                department: { select: { name: true } },
                location: { select: { name: true, city: true, state: true } },
            },
            orderBy: { firstName: "asc" },
        });

        const empMap = new Map<string, any>();
        employees.forEach((emp) => {
            empMap.set(emp.id, {
                id: emp.id,
                code: emp.employeeCode,
                name: `${emp.firstName} ${emp.lastName}`.trim(),
                designation: emp.designation?.title || "Team Member",
                level: emp.designation?.level || "L3",
                department: emp.department?.name || "General",
                location: emp.location?.city ? `${emp.location.city}, ${emp.location.state || ""}` : (emp.location?.name || ""),
                avatar: emp.avatarUrl || null,
                managerId: emp.reportingManagerId,
                directReportsCount: 0,
                children: [],
            });
        });

        const rootNodes: any[] = [];
        empMap.forEach((node) => {
            if (node.managerId && empMap.has(node.managerId)) {
                const managerNode = empMap.get(node.managerId);
                managerNode.children.push(node);
                managerNode.directReportsCount += 1;
            } else {
                rootNodes.push(node);
            }
        });

        return rootNodes;
    }

    // =========================================================
    // LOCATION HOLIDAYS
    // =========================================================

    async getHolidays(year?: number, locationId?: string) {
        const currentYear = year || new Date().getFullYear();
        const where: any = { year: currentYear };
        if (locationId) {
            where.OR = [{ locationId }, { locationId: null }];
        }
        const holidays = await prisma.holiday.findMany({
            where,
            include: { location: { select: { name: true, city: true, state: true } } },
            orderBy: { date: "asc" },
        });
        return holidays.map((h) => ({
            id: h.id,
            name: h.name,
            date: h.date.toISOString().slice(0, 10),
            year: h.year,
            isMandatory: h.isMandatory,
            locationId: h.locationId,
            locationName: h.location ? (h.location.city ? `${h.location.city}, ${h.location.state || ""}` : h.location.name) : "All Locations",
        }));
    }

    async addHoliday(data: { name: string; date: string; locationId?: string; isMandatory?: boolean }) {
        const dateObj = new Date(data.date);
        const holiday = await prisma.holiday.create({
            data: {
                name: data.name,
                date: dateObj,
                year: dateObj.getFullYear(),
                locationId: data.locationId || null,
                isMandatory: data.isMandatory ?? true,
            },
        });
        return holiday;
    }

    async deleteHoliday(id: string) {
        await prisma.holiday.delete({ where: { id } });
        return { success: true };
    }

    private mapCompany(company: any) {
        return {
            id: company.id,
            name: company.name,
            registrationNumber: company.registrationNumber ?? "",
            country: company.country ?? "",
            currency: company.currency ?? "",
        };
    }
}

export const organizationManagementService =
    new OrganizationManagementService();

