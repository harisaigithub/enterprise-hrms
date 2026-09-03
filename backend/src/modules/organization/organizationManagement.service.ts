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

    async getLocations() {
        const locations = await prisma.location.findMany({
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
            status: cc.isActive ? "Active" : "Inactive",
        }));
    }

    async addCostCenter(data: any) {
        if (!data.code?.trim()) {
            throw new Error("Cost Center code is required");
        }

        if (!data.name?.trim()) {
            throw new Error("Cost Center name is required");
        }

        const existing = await prisma.costCenter.findFirst({
            where: {
                code: data.code.trim(),
            },
        });

        if (existing) {
            throw new Error("Cost Center with this code already exists");
        }

        const costCenter = await prisma.costCenter.create({
            data: {
                code: data.code.trim(),
                name: data.name.trim(),

                ...(data.departmentIds?.length > 0 && {
                    departments: {
                        connect: data.departmentIds.map((id: string) => ({
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
            departmentIds: (costCenter as any).departments?.map(
                (d: any) => d.id
            ) ?? [],
            isActive: costCenter.isActive,
            status: costCenter.isActive ? "Active" : "Inactive",
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
                isActive: data.isActive ?? true,
            },
        });

        return {
            id: designation.id,
            title: designation.title,
            grade: designation.grade,
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

            console.log("✅ Grades fetched:", grades.length);

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