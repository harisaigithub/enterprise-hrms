import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import {
    AssetStatus,
    AssetRequestStatus,
    AssetReturnCondition,
} from "@prisma/client";
import { countActiveLicenseAllocations, licenseAllocationKey } from "./asset.allocations";
import type { AccessTokenPayload } from "../../lib/jwt";
import * as workflowService from "../workflow/workflow.service";
import { requiresAssetApproval } from "./asset.approval";

function normalizeApproverName(value?: string | null) {
    const raw = String(value ?? "").trim();

    if (!raw) {
        return null;
    }

    if (raw.includes(":")) {
        const cleaned = raw.split(":").slice(1).join(":").trim();
        if (cleaned) {
            return cleaned;
        }
    }

    return raw;
}

/* =========================================================
   INVENTORY
========================================================= */

export async function getInventory() {
    return prisma.asset.findMany({
        include: {
            currentHolder: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

/* =========================================================
   ADD INVENTORY ITEM
========================================================= */

export async function addInventoryItem(data: {
    serial: string;
    category: string;
    make?: string | null;
    model?: string | null;
    status?: string | null;
    purchaseDate?: string | null;
    purchaseCost?: number | string | null;
    location?: string | null;
    warrantyExpiry?: string | null;
    vendor?: string | null;
    conditionNotes?: string | null;
    seats?: number;
    licenseExpiry?: string | null;
}) {
    const normalizedStatus =
        data.status && Object.values(AssetStatus).includes(data.status as AssetStatus)
            ? (data.status as AssetStatus)
            : AssetStatus.IN_STOCK;

    const asset = await prisma.asset.create({
        data: {
            serial: data.serial,
            category: data.category,
            make: data.make || null,
            model: data.model || null,
            status: normalizedStatus,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            purchaseCost:
                data.purchaseCost != null && data.purchaseCost !== ""
                    ? Number(data.purchaseCost)
                    : null,
            location: data.location || null,
            warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
            vendor: data.vendor || null,
            conditionNotes: data.conditionNotes || null,

            ...(data.category === "Software License"
                ? {
                    seats: data.seats || 0,
                    seatsUsed: 0,
                    licenseExpiry: data.licenseExpiry
                        ? new Date(data.licenseExpiry)
                        : null,
                }
                : {}),
        },
    });

    return asset;
}

export async function updateInventoryItem(assetId: string, data: {
    make?: string | null;
    model?: string | null;
    location?: string | null;
    vendor?: string | null;
    conditionNotes?: string | null;
    warrantyExpiry?: string | null;
    purchaseCost?: number | string | null;
}) {
    const current = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!current) throw AppError.notFound("Asset not found");
    const warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : data.warrantyExpiry === null ? null : undefined;
    if (warrantyExpiry && Number.isNaN(warrantyExpiry.getTime())) throw AppError.badRequest("Warranty expiry must be a valid date");
    const purchaseCost = data.purchaseCost == null || data.purchaseCost === "" ? data.purchaseCost : Number(data.purchaseCost);
    if (typeof purchaseCost === "number" && (!Number.isFinite(purchaseCost) || purchaseCost < 0)) {
        throw AppError.badRequest("Purchase cost must be a non-negative amount");
    }
    const changes = {
        ...(data.make !== undefined ? { make: data.make || null } : {}),
        ...(data.model !== undefined ? { model: data.model || null } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.vendor !== undefined ? { vendor: data.vendor || null } : {}),
        ...(data.conditionNotes !== undefined ? { conditionNotes: data.conditionNotes || null } : {}),
        ...(warrantyExpiry !== undefined ? { warrantyExpiry } : {}),
        ...(purchaseCost !== undefined ? { purchaseCost: purchaseCost == null ? null : purchaseCost } : {}),
    };
    return prisma.$transaction(async (tx) => {
        const updated = await tx.asset.update({ where: { id: assetId }, data: changes, include: { currentHolder: true } });
        await tx.assetHistory.create({
            data: { assetId, action: "UPDATED", detail: "Inventory metadata updated" },
        });
        return updated;
    });
}

export async function assignInventoryItem(assetId: string, employeeId: string) {
    return prisma.$transaction(async (tx) => {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw AppError.notFound("Asset not found");
        const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true, status: true } });
        if (!employee || employee.status !== "Active") throw AppError.badRequest("Select an active employee");
        if (asset.status !== AssetStatus.IN_STOCK) throw AppError.conflict("Only in-stock assets can be assigned");

        const isLicense = asset.category === "Software License";
        const claimed = await tx.asset.updateMany({
            where: {
                id: assetId,
                status: AssetStatus.IN_STOCK,
                ...(isLicense ? { seatsUsed: { lt: asset.seats ?? 0 } } : {}),
            },
            data: isLicense
                ? { seatsUsed: { increment: 1 } }
                : { status: AssetStatus.ASSIGNED, currentHolderId: employeeId, acknowledged: false },
        });
        if (claimed.count !== 1) throw AppError.conflict(isLicense ? "This license has no available seats" : "This asset is no longer in stock");

        await tx.assetHistory.create({
            data: { assetId, employeeId, action: "ASSIGNED", detail: "Asset assigned directly from inventory" },
        });
        return tx.asset.findUniqueOrThrow({
            where: { id: assetId },
            include: { currentHolder: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
        });
    });
}

export async function retireInventoryItem(assetId: string, reason: string) {
    const note = reason.trim();
    if (!note) throw AppError.badRequest("A retirement reason is required");
    return prisma.$transaction(async (tx) => {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw AppError.notFound("Asset not found");
        if (
            (asset.status !== AssetStatus.IN_STOCK &&
                asset.status !== AssetStatus.DAMAGED &&
                asset.status !== AssetStatus.MAINTENANCE) ||
            asset.currentHolderId
        ) {
            throw AppError.conflict("Return or reclaim this asset before retiring it.");
        }
        const claimed = await tx.asset.updateMany({
            where: { id: assetId, status: asset.status, currentHolderId: null },
            data: { status: AssetStatus.RETIRED, conditionNotes: asset.conditionNotes ? `${asset.conditionNotes}\nRetired: ${note}` : `Retired: ${note}` },
        });
        if (claimed.count !== 1) throw AppError.conflict("This asset changed while it was being retired.");
        await tx.assetHistory.create({ data: { assetId, action: "RETIRED", detail: note } });
        return tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    });
}

export async function setAssetMaintenance(assetId: string, reason: string) {
    const note = reason.trim();
    if (!note) throw AppError.badRequest("A repair note is required");
    return prisma.$transaction(async (tx) => {
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw AppError.notFound("Asset not found");
        if (asset.status !== AssetStatus.DAMAGED || asset.currentHolderId) {
            throw AppError.conflict("Only unassigned damaged assets can be sent for repair.");
        }
        const claimed = await tx.asset.updateMany({
            where: { id: assetId, status: AssetStatus.DAMAGED, currentHolderId: null },
            data: {
                status: AssetStatus.MAINTENANCE,
                conditionNotes: asset.conditionNotes ? `${asset.conditionNotes}\nRepair: ${note}` : `Repair: ${note}`,
            },
        });
        if (claimed.count !== 1) throw AppError.conflict("This asset changed while it was being sent for repair.");
        await tx.assetHistory.create({ data: { assetId, action: "SENT_FOR_REPAIR", detail: note } });
        return tx.asset.findUniqueOrThrow({ where: { id: assetId } });
    });
}

/* =========================================================
   ASSET HISTORY
========================================================= */

export async function getAssetHistory(assetId: string) {
    return prisma.assetHistory.findMany({
        where: {
            assetId,
        },
        include: {
            employee: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

/* =========================================================
   LICENSE ALERTS
========================================================= */

export async function getLicenseAlerts() {
    const licenses = await prisma.asset.findMany({
        where: {
            category: "Software License",
        },
    });

    const today = new Date();

    return licenses
        .map((asset) => {
            const alerts: string[] = [];

            if (asset.licenseExpiry) {
                const expiry = new Date(asset.licenseExpiry);

                const diff =
                    expiry.getTime() - today.getTime();

                const days =
                    Math.ceil(diff / (1000 * 60 * 60 * 24));

                if (days < 0) {
                    alerts.push("License expired");
                } else if (days <= 30) {
                    alerts.push(`Expires in ${days} days`);
                }
            }

            if (
                asset.seats !== null &&
                asset.seatsUsed >= asset.seats
            ) {
                alerts.push("All seats are used");
            }

            return {
                asset,
                alerts,
            };
        })
        .filter((x) => x.alerts.length > 0);
}

/* =========================================================
   REQUESTS
========================================================= */

export async function getRequests(
    userId: string,
    role: string
) {
    const normalizedRole = role.toUpperCase();

    // ADMIN / HR / MANAGER → all requests
    if (
        normalizedRole === "ADMIN" ||
        normalizedRole === "HR" ||
        normalizedRole === "MANAGER"
    ) {
        return prisma.assetRequest.findMany({
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        reportingManager: { select: { employeeCode: true } },
                    },
                },
                asset: true,
                workflowInstance: {
                    select: {
                        id: true,
                        status: true,
                        currentStepIndex: true,
                        steps: {
                            select: {
                                name: true,
                                approverRule: true,
                                approverId: true,
                                approverName: true,
                                escalatedTo: true,
                                status: true,
                                actedByName: true,
                                actedAt: true,
                                roleApproverOverride: true,
                                rejectionReason: true,
                            },
                            orderBy: { startedAt: "asc" },
                        },
                    },
                },
            },
            orderBy: {
                raisedAt: "desc",
            },
        });
    }

    // EMPLOYEE → only own requests
    const employee = await prisma.employee.findUnique({
        where: {
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!employee) {
        throw new Error("Employee profile not found");
    }

    return prisma.assetRequest.findMany({
        where: {
            employeeId: employee.id,
        },
        include: {
            employee: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                        reportingManager: { select: { employeeCode: true } },
                },
            },
            asset: true,
                workflowInstance: {
                    select: {
                        id: true,
                        status: true,
                        currentStepIndex: true,
                        steps: {
                            select: {
                                name: true,
                                approverRule: true,
                                approverId: true,
                                approverName: true,
                                escalatedTo: true,
                                status: true,
                                actedByName: true,
                                actedAt: true,
                                roleApproverOverride: true,
                                rejectionReason: true,
                            },
                            orderBy: { startedAt: "asc" },
                        },
                    },
                },
        },
        orderBy: {
            raisedAt: "desc",
        },
    });
}
/* =========================================================
   RAISE REQUEST
========================================================= */

export async function raiseRequest(
    userId: string,
    data: {
        category: string;
        justification: string;
        assetType?: string | null;
        model?: string | null;
        quantity?: number | string | null;
        neededBy?: string | null;
        requestType?: string | null;
        deliveryLocation?: string | null;
        replacementAssetId?: string | null;
        costCenter?: string | null;
        attachmentUrl?: string | null;
        estimatedCost?: number | string | null;
    }
) {
    const employee =
        await prisma.employee.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                status: true,
            },
        });

    if (!employee) {
        throw new Error(
            "Employee profile not found"
        );
    }

    if (employee.status !== "Active") {
        throw new Error(
            "Employee is inactive"
        );
    }

    const estimatedCost = data.estimatedCost == null || data.estimatedCost === "" ? null : Number(data.estimatedCost);
    if (estimatedCost !== null && (!Number.isFinite(estimatedCost) || estimatedCost < 0)) {
        throw AppError.badRequest("Estimated cost must be a non-negative amount");
    }

    const needsApproval = requiresAssetApproval(data.category, estimatedCost);

    const status = needsApproval
        ? AssetRequestStatus.PENDING_APPROVAL
        : AssetRequestStatus.APPROVED;

    const quantity =
        data.quantity != null && data.quantity !== ""
            ? Math.max(1, Number(data.quantity))
            : 1;
    const neededBy = data.neededBy ? new Date(data.neededBy) : null;
    if (neededBy && Number.isNaN(neededBy.getTime())) {
        throw AppError.badRequest("Needed-by date must be a valid calendar date");
    }
    if (neededBy && neededBy.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
        throw AppError.badRequest("Needed-by date cannot be in the past");
    }

    const workflowDefinition = needsApproval
        ? await prisma.workflowDefinition.findFirst({
            where: { requestType: "Asset Allocation", status: "Active" },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        })
        : null;
    if (needsApproval && !workflowDefinition) {
        throw AppError.conflict("Asset Allocation workflow is not installed. Install it from Workflow Library first.");
    }

    return prisma.$transaction(async (tx) => {
        const workflow = workflowDefinition
            ? await workflowService.submitRequest(workflowDefinition.id, employee.employeeCode, {
                asset_value: estimatedCost ?? 0,
            }, tx)
            : null;
        return tx.assetRequest.create({
            data: {
                employeeId: employee.id,
                category: data.category,
                justification: data.justification,
                assetType: data.assetType || null,
                model: data.model || null,
                quantity,
                neededBy,
                requestType: data.requestType || null,
                deliveryLocation: data.deliveryLocation || null,
                replacementAssetId: data.replacementAssetId || null,
                costCenter: data.costCenter || null,
                estimatedCost,
                attachmentUrl: data.attachmentUrl || null,
                status,
                workflowInstanceId: workflow?.data.id ?? null,
                approvedBy: needsApproval ? null : "Auto-approved by category/threshold policy",
                approvedAt: needsApproval ? null : new Date(),
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    });
}

/* =========================================================
   APPROVE REQUEST
========================================================= */

export async function approveRequest(
    requestId: string,
    actor: AccessTokenPayload
) {
    const request = await prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw AppError.notFound("Asset request not found");
    if (request.status !== AssetRequestStatus.PENDING_APPROVAL) {
        throw AppError.conflict(`Only pending requests can be approved (current: ${request.status})`);
    }

    if (requiresAssetApproval(request.category, request.estimatedCost == null ? null : Number(request.estimatedCost)) && !request.workflowInstanceId) {
        throw AppError.conflict("This request requires an approval workflow, but no workflow is linked. Contact HR before proceeding.");
    }

    if (request.workflowInstanceId) {
        if (!actor.employeeCode) throw AppError.forbidden("Approver must be linked to an employee record");
        const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || actor.employeeCode;
        await workflowService.actOnStep(
            request.workflowInstanceId,
            actor.employeeCode,
            actorName,
            "approve",
            undefined,
            { bypassRoleApprover: actor.role === "ADMIN" && (actor.permissions?.includes("workflows:write") ?? false), actorRole: actor.role }
        );
        return prisma.assetRequest.findUnique({
            where: { id: requestId },
            include: { employee: true, asset: true, workflowInstance: { select: { id: true, status: true, currentStepIndex: true } } },
        });
    }

    const normalizedApproverName = normalizeApproverName(actor.name) || "Manager";

    return prisma.assetRequest.update({
        where: {
            id: requestId,
        },

        data: {
            status: AssetRequestStatus.APPROVED,
            approvedBy: normalizedApproverName,
            approvedAt: new Date(),
        },

        include: {
            employee: true,
            asset: true,
        },
    });
}

/* =========================================================
   REJECT REQUEST
========================================================= */

export async function rejectRequest(
    requestId: string,
    actor: AccessTokenPayload,
    reason: string
) {
    const request = await prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw AppError.notFound("Asset request not found");
    const rejectionReason = reason?.trim();
    if (!rejectionReason) throw AppError.badRequest("A rejection reason is required.");
    if (request.status !== AssetRequestStatus.PENDING_APPROVAL) {
        throw AppError.conflict(`Only pending requests can be rejected (current: ${request.status})`);
    }
    if (request.workflowInstanceId) {
        if (!actor.employeeCode) throw AppError.forbidden("Approver must be linked to an employee record");
        const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || actor.employeeCode;
        await workflowService.actOnStep(
            request.workflowInstanceId,
            actor.employeeCode,
            actorName,
            "reject",
            rejectionReason,
            { bypassRoleApprover: actor.role === "ADMIN" && (actor.permissions?.includes("workflows:write") ?? false), actorRole: actor.role }
        );
        return prisma.assetRequest.findUnique({
            where: { id: requestId },
            include: { employee: true, asset: true, workflowInstance: { select: { id: true, status: true, currentStepIndex: true } } },
        });
    }
    return prisma.assetRequest.update({
        where: {
            id: requestId,
        },

        data: {
            status: AssetRequestStatus.REJECTED,
            rejectionReason,
        },

        include: {
            employee: true,
            asset: true,
        },
    });
}

/* =========================================================
   FULFILL REQUEST
========================================================= */

export async function fulfillRequest(
    requestId: string,
    assetId?: string | null
) {
    return prisma.$transaction(async (tx: any) => {
        const request = await tx.assetRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) throw AppError.notFound("Asset request not found");

        const allowedStatuses = [
            AssetRequestStatus.APPROVED,
            AssetRequestStatus.PENDING_PROCUREMENT,
        ];
        if (!allowedStatuses.includes(request.status)) {
            throw AppError.conflict(
                `Only approved or pending-procurement requests can be fulfilled (current: ${request.status})`
            );
        }
        if (requiresAssetApproval(request.category, request.estimatedCost == null ? null : Number(request.estimatedCost))) {
            if (!request.workflowInstanceId) {
                throw AppError.conflict("This request requires an approval workflow before fulfillment.");
            }
            const workflow = await tx.workflowInstance.findUnique({
                where: { id: request.workflowInstanceId },
                select: { status: true },
            });
            if (workflow?.status !== "Approved") {
                throw AppError.conflict("The linked approval workflow must be fully approved before fulfillment.");
            }
        }

        if (!assetId) {
            const claimedRequest = await tx.assetRequest.updateMany({
                where: { id: requestId, status: { in: allowedStatuses } },
                data: { status: AssetRequestStatus.PENDING_PROCUREMENT },
            });
            if (claimedRequest.count !== 1) {
                throw AppError.conflict("Asset request has already changed");
            }

            return {
                request: await tx.assetRequest.findUniqueOrThrow({ where: { id: requestId } }),
                procurementNeeded: true,
            };
        }

        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw AppError.notFound("Asset not found");
        if (asset.category !== request.category) {
            throw AppError.badRequest("Selected asset category does not match request");
        }

        const claimedRequest = await tx.assetRequest.updateMany({
            where: { id: requestId, status: { in: allowedStatuses } },
            data: {
                status: AssetRequestStatus.FULFILLED,
                assetId: asset.id,
                fulfilledAt: new Date(),
            },
        });
        if (claimedRequest.count !== 1) {
            throw AppError.conflict("Asset request has already changed");
        }

        const isLicense = asset.category === "Software License";
        const claimedAsset = await tx.asset.updateMany({
            where: {
                id: asset.id,
                ...(isLicense
                    ? {
                        status: AssetStatus.IN_STOCK,
                        seatsUsed: { lt: asset.seats ?? 0 },
                    }
                    : { status: AssetStatus.IN_STOCK }),
            },
            data: isLicense
                ? { seatsUsed: { increment: 1 } }
                : {
                    status: AssetStatus.ASSIGNED,
                    currentHolderId: request.employeeId,
                    acknowledged: false,
                },
        });
        if (claimedAsset.count !== 1) {
            throw AppError.conflict(
                isLicense ? "Selected license has no available seats" : "Selected asset is no longer available"
            );
        }

        const updatedAsset = await tx.asset.findUniqueOrThrow({ where: { id: asset.id } });
        const updatedRequest = await tx.assetRequest.findUniqueOrThrow({ where: { id: requestId } });

        await tx.assetHistory.create({
            data: {
                assetId: asset.id,
                employeeId: request.employeeId,
                action: "ASSIGNED",
                detail: `Asset assigned for request ${requestId}`,
            },
        });

        return { request: updatedRequest, asset: updatedAsset };
    });
}

export async function getMyAssets(userId: string) {
    const employee = await prisma.employee.findUnique({
        where: {
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!employee) {
        throw new Error("Employee profile not found");
    }

    const assets = await prisma.asset.findMany({
        where: {
            currentHolderId: employee.id,
            status: "ASSIGNED",
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    const licenseHistory = await prisma.assetHistory.findMany({
        where: {
            employeeId: employee.id,
            asset: { category: "Software License" },
        },
        include: { asset: true },
        orderBy: { createdAt: "desc" },
    });
    const activeLicenseAllocations = countActiveLicenseAllocations(licenseHistory);

    const allocatedLicenses = licenseHistory
        .filter((entry) =>
            (activeLicenseAllocations.get(licenseAllocationKey(entry.assetId, employee.id)) ?? 0) > 0
        )
        .map((entry) => entry.asset);
    return [...assets, ...allocatedLicenses.filter((license, index, list) =>
        !assets.some((asset) => asset.id === license.id) &&
        list.findIndex((candidate) => candidate.id === license.id) === index
    )];
}

/* =========================================================
   ACKNOWLEDGE RECEIPT
========================================================= */

export async function acknowledgeReceipt(
    assetId: string,
    userId: string,
    role: string
) {
    const normalizedRole = role.toUpperCase();

    const asset = await prisma.asset.findUnique({
        where: {
            id: assetId,
        },
    });

    if (!asset) {
        throw new Error("Asset not found");
    }

    // ADMIN / HR / MANAGER → full access
    if (
        normalizedRole === "ADMIN" ||
        normalizedRole === "HR" ||
        normalizedRole === "MANAGER"
    ) {
        return prisma.asset.update({
            where: {
                id: assetId,
            },
            data: {
                acknowledged: true,
            },
        });
    }

    // EMPLOYEE → only own asset
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            employee: {
                select: {
                    id: true,
                },
            },
        },
    });

    const employeeId = user?.employee?.id;

    if (!employeeId) {
        throw new Error(
            "Authenticated user is not linked to an employee"
        );
    }

    if (asset.currentHolderId !== employeeId) {
        throw new Error(
            "This asset is not assigned to you"
        );
    }

    return prisma.asset.update({
        where: {
            id: assetId,
        },
        data: {
            acknowledged: true,
        },
    });
}
/* =========================================================
   RETURN ASSET
========================================================= */

export async function returnAsset(
    assetId: string,
    userId: string,
    role: string,
    condition: string,
    wipeCompleted: boolean
) {
    const normalizedRole = role.toUpperCase();
    const isManagerRole =
        normalizedRole === "ADMIN" ||
        normalizedRole === "HR" ||
        normalizedRole === "MANAGER";
    let employeeId: string | undefined;
    if (!isManagerRole) {
        const employee = await prisma.employee.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!employee) {
            return {
                error: "Employee profile not found",
            };
        }

        if (employee.status !== "Active") {
            return {
                error: "Employee is inactive",
            };
        }

        employeeId = employee.id;
    }

    const returnCondition =
        condition === "Damaged"
            ? AssetReturnCondition.DAMAGED
            : AssetReturnCondition.GOOD;

    return prisma.$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${assetId}::uuid FOR UPDATE`;
        const asset = await tx.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw AppError.notFound("Asset not found");

        const isLicense = asset.category === "Software License";
        let returningEmployeeId = isLicense ? employeeId ?? undefined : asset.currentHolderId ?? undefined;

        if (isLicense) {
            const history = await tx.assetHistory.findMany({
                where: { assetId, ...(employeeId ? { employeeId } : {}) },
                orderBy: { createdAt: "desc" },
            });
            const activeAllocations = countActiveLicenseAllocations(history);
            const allocation = history.find((entry) =>
                entry.action === "ASSIGNED" &&
                entry.employeeId &&
                (activeAllocations.get(licenseAllocationKey(assetId, entry.employeeId)) ?? 0) > 0
            );
            if (!allocation?.employeeId) {
                throw AppError.conflict("This license is not assigned to the selected employee");
            }
            returningEmployeeId = allocation.employeeId;
        } else if (asset.status !== AssetStatus.ASSIGNED || !asset.currentHolderId) {
            throw AppError.conflict("This asset is not currently assigned");
        } else if (employeeId && asset.currentHolderId !== employeeId) {
            throw AppError.forbidden("This asset is not assigned to you");
        }

        const dataBearingCategories = ["Laptop", "Desktop", "Mobile Phone", "Tablet"];
        if (dataBearingCategories.includes(asset.category) && !wipeCompleted) {
            throw AppError.badRequest(
                "Disk wipe / reimage must be completed before returning this device."
            );
        }

        if (isLicense) {
            const releasedSeat = await tx.asset.updateMany({
                where: { id: assetId, seatsUsed: { gt: 0 } },
                data: { seatsUsed: { decrement: 1 } },
            });
            if (releasedSeat.count !== 1) {
                throw AppError.conflict("The license has no active seat allocation");
            }
        } else {
            await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: condition === "Damaged" ? AssetStatus.DAMAGED : AssetStatus.IN_STOCK,
                    currentHolderId: null,
                    acknowledged: false,
                },
            });
        }

        const updatedAsset = await tx.asset.findUniqueOrThrow({ where: { id: assetId } });

        await tx.assetHistory.create({
            data: {
                assetId,
                employeeId: returningEmployeeId ?? null,
                action: "RETURNED",
                condition: returnCondition,
                wipeCompleted,
                detail: condition === "Damaged" ? "Asset returned damaged" : "Asset returned to inventory",
            },
        });

        return {
            asset: updatedAsset,
        };
    });
}

/* =========================================================
   PENDING RETURNS
========================================================= */

export async function getPendingReturnsForEmployee(
    userId: string
) {
    const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    return prisma.asset.findMany({
        where: {
            currentHolderId: employee.id,
            status: AssetStatus.ASSIGNED,
        },

        orderBy: {
            updatedAt: "desc",
        },
    });
}
