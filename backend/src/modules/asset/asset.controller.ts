import { Request, Response } from "express";
import * as assetService from "./asset.service";

/* =========================================================
   INVENTORY
========================================================= */

export async function getInventory(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.getInventory();

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch inventory",
        });
    }
}

export async function addInventoryItem(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.addInventoryItem(req.body);

        res.status(201).json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add inventory item",
        });
    }
}

/* =========================================================
   HISTORY
========================================================= */

export async function getAssetHistory(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.getAssetHistory(
                req.params.assetId
            );

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch asset history",
        });
    }
}

/* =========================================================
   LICENSE ALERTS
========================================================= */

export async function getLicenseAlerts(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.getLicenseAlerts();

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch license alerts",
        });
    }
}

/* =========================================================
   REQUESTS
========================================================= */

export async function getRequests(
    req: Request,
    res: Response
) {
    try {
        const employeeId =
            typeof req.query.employeeId === "string"
                ? req.query.employeeId
                : undefined;

        const data =
            await assetService.getRequests(
                employeeId
            );

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch asset requests",
        });
    }
}

/* =========================================================
   RAISE REQUEST
========================================================= */

export async function raiseRequest(
    req: Request,
    res: Response
) {
    try {
        if (!req.auth) {
            throw new Error("Authentication required");
        }

        const data =
            await assetService.raiseRequest(
                req.auth.sub,
                req.body
            );

        res.status(201).json(data);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to raise request",
        });
    }
}

/* =========================================================
   APPROVE
========================================================= */

export async function approveRequest(
    req: Request,
    res: Response
) {
    try {
        const approverName =
            req.body?.approverName || "Manager";

        const data =
            await assetService.approveRequest(
                req.params.id,
                approverName
            );

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to approve request",
        });
    }
}

/* =========================================================
   REJECT
========================================================= */

export async function rejectRequest(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.rejectRequest(
                req.params.id
            );

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to reject request",
        });
    }
}

/* =========================================================
   FULFILL
========================================================= */

export async function fulfillRequest(
    req: Request,
    res: Response
) {
    try {
        const data =
            await assetService.fulfillRequest(
                req.params.id,
                req.body?.assetId || null
            );

        if ("error" in data) {
            return res.status(400).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fulfill request",
        });
    }
}


export async function getMyAssets(
  req: Request,
  res: Response
) {
  try {
    if (!req.auth?.sub) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const data =
      await assetService.getMyAssets(req.auth.sub);

    res.json(data);
  } catch (error) {
    console.error("Get my assets error:", error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch my assets",
    });
  }
}

/* =========================================================
   ACKNOWLEDGE
========================================================= */

export async function acknowledgeReceipt(
    req: Request,
    res: Response
) {
    try {
        if (!req.auth) {
            throw new Error("Authentication required");
        }

        const data =
            await assetService.acknowledgeReceipt(
                req.params.id,
                req.auth.sub
            );

        res.json(data);
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to acknowledge receipt",
        });
    }
}

/* =========================================================
   RETURN
========================================================= */

export async function returnAsset(
  req: Request,
  res: Response
) {
  try {
    if (!req.auth) {
      throw new Error("Authentication required");
    }

    const {
      condition,
      wipeCompleted,
    } = req.body;

    const data =
      await assetService.returnAsset(
        req.params.id,
        req.auth.sub,
        condition,
        Boolean(wipeCompleted)
      );

    if ("error" in data) {
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to return asset",
    });
  }
}

/* =========================================================
   PENDING RETURNS
========================================================= */

export async function getPendingReturns(
  req: Request,
  res: Response
) {
  try {
    if (!req.auth) {
      throw new Error("Authentication required");
    }

    const data =
      await assetService.getPendingReturnsForEmployee(
        req.auth.sub
      );

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch pending returns",
    });
  }
}