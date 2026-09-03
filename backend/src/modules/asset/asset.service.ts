import { prisma } from "../../lib/prisma";
import {
    AssetStatus,
    AssetRequestStatus,
    AssetReturnCondition,
} from "@prisma/client";

/* =========================================================
   Helper: Employee Code / UUID -> Employee
========================================================= */

async function findEmployee(employeeIdOrCode: string) {
    return prisma.employee.findFirst({
        where: {
            OR: [
                { id: employeeIdOrCode },
                { employeeCode: employeeIdOrCode },
            ],
        },
    });
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
    make?: string;
    model?: string;
    seats?: number;
    licenseExpiry?: string | null;
}) {
    const asset = await prisma.asset.create({
        data: {
            serial: data.serial,
            category: data.category,
            make: data.make || null,
            model: data.model || null,

            status: AssetStatus.IN_STOCK,

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
    employeeIdOrCode?: string | null
) {
    let employeeId: string | undefined;

    if (employeeIdOrCode) {
        const employee = await findEmployee(employeeIdOrCode);

        if (!employee) {
            throw new Error("Employee not found");
        }

        employeeId = employee.id;
    }

    return prisma.assetRequest.findMany({
        where: employeeId
            ? {
                employeeId,
            }
            : undefined,

        include: {
            employee: {
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                },
            },

            asset: true,
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

    const categoriesRequiringApproval = [
        "Laptop",
        "Desktop",
        "Mobile Phone",
        "Tablet",
        "Software License",
    ];

    const needsApproval =
        categoriesRequiringApproval.includes(data.category);

    const status = needsApproval
        ? AssetRequestStatus.PENDING_APPROVAL
        : AssetRequestStatus.APPROVED;

    return prisma.assetRequest.create({
        data: {
            employeeId: employee.id,
            category: data.category,
            justification: data.justification,
            status,
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
}

/* =========================================================
   APPROVE REQUEST
========================================================= */

export async function approveRequest(
    requestId: string,
    approverName: string
) {
    return prisma.assetRequest.update({
        where: {
            id: requestId,
        },

        data: {
            status: AssetRequestStatus.APPROVED,
            approvedBy: approverName,
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
    requestId: string
) {
    return prisma.assetRequest.update({
        where: {
            id: requestId,
        },

        data: {
            status: AssetRequestStatus.REJECTED,
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
    const request = await prisma.assetRequest.findUnique({
        where: {
            id: requestId,
        },
    });

    if (!request) {
        throw new Error("Asset request not found");
    }

    if (
        request.status !== AssetRequestStatus.APPROVED
    ) {
        throw new Error(
            "Only approved requests can be fulfilled"
        );
    }

    /* ---------------------------------------------
       No asset selected
    --------------------------------------------- */

    if (!assetId) {
        const updatedRequest =
            await prisma.assetRequest.update({
                where: {
                    id: requestId,
                },

                data: {
                    status:
                        AssetRequestStatus.PENDING_PROCUREMENT,
                },
            });

        return {
            request: updatedRequest,
            procurementNeeded: true,
        };
    }

    /* ---------------------------------------------
       Find asset
    --------------------------------------------- */

    const asset = await prisma.asset.findUnique({
        where: {
            id: assetId,
        },
    });

    if (!asset) {
        return {
            error: "Asset not found",
        };
    }

    if (asset.status !== AssetStatus.IN_STOCK) {
        return {
            error: "Selected asset is not available",
        };
    }

    if (asset.category !== request.category) {
        return {
            error:
                "Selected asset category does not match request",
        };
    }

    /* ---------------------------------------------
       Assign asset
    --------------------------------------------- */

    const result = await prisma.$transaction(
        async (tx: any) => {
            const updatedAsset =
                await tx.asset.update({
                    where: {
                        id: asset.id,
                    },

                    data: {
                        status: AssetStatus.ASSIGNED,
                        currentHolderId: request.employeeId,
                        acknowledged: false,

                        ...(asset.category === "Software License"
                            ? {
                                seatsUsed: {
                                    increment: 1,
                                },
                            }
                            : {}),
                    },
                });

            const updatedRequest =
                await tx.assetRequest.update({
                    where: {
                        id: requestId,
                    },

                    data: {
                        status: AssetRequestStatus.FULFILLED,
                        assetId: asset.id,
                        fulfilledAt: new Date(),
                    },
                });

            await tx.assetHistory.create({
                data: {
                    assetId: asset.id,
                    employeeId: request.employeeId,
                    action: "ASSIGNED",
                    detail: `Asset assigned for request ${requestId}`,
                },
            });

            return {
                request: updatedRequest,
                asset: updatedAsset,
            };
        }
    );

    return result;
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

    return assets;
}

/* =========================================================
   ACKNOWLEDGE RECEIPT
========================================================= */

export async function acknowledgeReceipt(
    assetId: string,
    userId: string
) {
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

    const asset = await prisma.asset.findUnique({
        where: {
            id: assetId,
        },
    });

    if (!asset) {
        throw new Error("Asset not found");
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
    condition: string,
    wipeCompleted: boolean
) {

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

    const asset = await prisma.asset.findUnique({
        where: {
            id: assetId,
        },
    });

    if (!asset) {
        return {
            error: "Asset not found",
        };
    }

    if (asset.currentHolderId !== employee.id) {
        return {
            error: "This asset is not assigned to you",
        };
    }

    const dataBearingCategories = [
        "Laptop",
        "Desktop",
        "Mobile Phone",
        "Tablet",
    ];

    const isDataBearing =
        dataBearingCategories.includes(
            asset.category
        );

    if (
        isDataBearing &&
        condition === "Good" &&
        !wipeCompleted
    ) {
        return {
            error:
                "Disk wipe / reimage must be completed before returning this device to stock.",
        };
    }

    const returnCondition =
        condition === "Damaged"
            ? AssetReturnCondition.DAMAGED
            : AssetReturnCondition.GOOD;

    return prisma.$transaction(async (tx: any) => {
        const updated =
            await tx.asset.update({
                where: {
                    id: assetId,
                },

                data: {
                    status:
                        condition === "Damaged"
                            ? AssetStatus.DAMAGED
                            : AssetStatus.IN_STOCK,

                    currentHolderId: null,
                    acknowledged: false,

                    ...(asset.category ===
                        "Software License"
                        ? {
                            seatsUsed: {
                                decrement: 1,
                            },
                        }
                        : {}),
                },
            });

        await tx.assetHistory.create({
            data: {
                assetId,
                employeeId: asset.currentHolderId,
                action: "RETURNED",
                condition: returnCondition,
                wipeCompleted,
                detail:
                    condition === "Damaged"
                        ? "Asset returned damaged"
                        : "Asset returned to inventory",
            },
        });

        return {
            asset: updated,
        };
    });
}

/* =========================================================
   PENDING RETURNS
========================================================= */

export async function getPendingReturnsForEmployee(
    employeeIdOrCode: string
) {
    const employee =
        await findEmployee(employeeIdOrCode);

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